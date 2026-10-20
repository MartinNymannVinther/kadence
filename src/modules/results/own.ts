import { and, eq, gte, isNull, or } from "drizzle-orm";
import { forget, recall, remember } from "@/core/counters";
import { env } from "@/core/env";
import { enqueue } from "@/core/jobs/queue";
import { calendarEvents, raceResults, riders } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { todayInCopenhagen } from "@/core/dates";
import { whoAmIIn } from "@/modules/team/access";
import type { DcuProfile } from "./dcu-profile";
import { planImport } from "./plan";
import { dcuReadRider, readKey } from "./queue";
import { exclusive, readProfile, sinceFor, STALE_MS, staleSince } from "./read";
import type { RefreshOutcome } from "./refresh";
import { readsRacesFor } from "./switch";

/**
 * A rider opening Kadence reads their own races into their own calendar
 * (ADR 0039). It is written as the rider, the way a ride from their bike
 * computer is (ADR 0018), and it writes only what the rider may write: a
 * race in their own calendar for a day that has none. The places are the
 * coach's to write, so they wait for a coach's visit (refresh.ts), which
 * finds these races and hangs the results on them.
 *
 * When this read last is kept with the counters (src/core/counters.ts,
 * ADR 0083), for as long as a reading stays fresh: the rider may not
 * write the rider row's note of when the races were read (drizzle/0016),
 * and the counters are shared by every instance and survive a restart.
 */

const ownReadKey = (riderId: string) => `dcu-own-read:${riderId}`;

/** A rider's new UCI ID is read afresh, whenever the last reading was. */
export async function forgetOwnRead(riderId: string): Promise<void> {
  await forget(ownReadKey(riderId));
}

/** Whether the rider's own reading is still fresh: read less than three hours ago. */
async function readLately(riderId: string): Promise<boolean> {
  const until = await recall(ownReadKey(riderId));
  return until !== null && until.getTime() > Date.now();
}

export async function refreshOwnRaces(
  ctx: OrgContext,
  options: { today?: string; profile?: DcuProfile } = {},
): Promise<RefreshOutcome> {
  const rider = await withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me?.rider) return null;
    const [row] = await tx
      .select({
        id: riders.id,
        uciId: riders.uciId,
        at: riders.racesCheckedAt,
        birthYear: riders.birthYear,
      })
      .from(riders)
      .where(eq(riders.id, me.rider.id));
    return row ?? null;
  });
  const uciId = rider?.uciId;
  if (!rider || !uciId || !readsRacesFor(env.DCU_RESULTS, uciId)) return { state: "off" };
  if (!staleSince(rider.at) || (await readLately(rider.id))) return { state: "fresh" };

  const outcome = await exclusive(rider.id, async (): Promise<RefreshOutcome> => {
    const read = options.profile
      ? { profile: options.profile }
      : await readProfile(uciId, rider.birthYear);
    await remember(ownReadKey(rider.id), new Date(Date.now() + STALE_MS));
    if ("error" in read) return { state: "failed", error: read.error };
    const since = sinceFor(options.today ?? todayInCopenhagen());
    return withOrgContext(ctx, async (tx) => {
      const events = await tx
        .select({
          id: calendarEvents.id,
          riderId: calendarEvents.riderId,
          kind: calendarEvents.kind,
          startsOn: calendarEvents.startsOn,
          endsOn: calendarEvents.endsOn,
        })
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.kind, "race"),
            or(isNull(calendarEvents.riderId), eq(calendarEvents.riderId, rider.id)),
            gte(calendarEvents.endsOn, since),
          ),
        );
      // The rider reads their own results (drizzle/0016), so a result read
      // before keeps the race it hangs on, as in the coach's import.
      const known = await tx
        .select({ ref: raceResults.sourceRef, eventId: raceResults.eventId })
        .from(raceResults)
        .where(eq(raceResults.riderId, rider.id));
      const plan = planImport({
        riderId: rider.id,
        results: read.profile.results,
        events,
        known: new Map(known.map((k) => [k.ref, k.eventId])),
        since,
      });
      if (plan.newRaces.length > 0) {
        await tx.insert(calendarEvents).values(
          plan.newRaces.map((race) => ({
            orgId: ctx.orgId,
            riderId: rider.id,
            kind: "race",
            title: race.title,
            startsOn: race.on,
            endsOn: race.on,
            source: "dcu",
            createdBy: ctx.userId,
          })),
        );
      }
      return { state: "read", newRaces: plan.newRaces.length, results: 0 };
    });
  });
  return outcome === "busy" ? { state: "busy" } : outcome;
}

/**
 * When a rider opens Kadence: their own races, in the line as a job for
 * the worker (queue.ts), which reads them if they are more than three
 * hours old.
 */
export async function refreshOwnRacesLater(ctx: OrgContext): Promise<void> {
  if (env.DCU_RESULTS === "off") return;
  const reading = { as: "rider" as const, userId: ctx.userId };
  await enqueue(dcuReadRider, reading, { orgId: ctx.orgId, dedupeKey: readKey(reading) });
}
