import { and, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { Refused } from "@/core/action";
import { env } from "@/core/env";
import { enqueue } from "@/core/jobs/queue";
import { rateLimit } from "@/core/rate-limit";
import { calendarEvents, raceResults, riders } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { todayInCopenhagen } from "@/core/dates";
import { requireCoach } from "@/modules/team/access";
import type { DcuProfile } from "./dcu-profile";
import { planImport } from "./plan";
import { dcuReadRider, readKey, spacedBy } from "./queue";
import { exclusive, readProfile, sinceFor, staleSince } from "./read";
import { readsRacesFor } from "./switch";

/**
 * Reads a rider's races from Cykling Danmark and puts them in the
 * calendar (ADR 0039): a race Kadence makes for the day where the
 * calendar has none, and the result on it for the coach.
 *
 * It runs for every rider whose races are more than three hours old, as
 * jobs in the line in queue.ts (docs/adr/0085): every hour for every team
 * with riders who have a UCI ID, read as a coach of the team (jobs.ts),
 * and when a coach opens Kadence, at most once an hour per team. A coach
 * may also ask, with the button on the rider's page, at most every ten
 * minutes. A rider opening Kadence reads their own races into their
 * calendar (own.ts); the places are written here, as a coach, because
 * only a coach writes them.
 *
 * The page is fetched outside any transaction; what it says is written in
 * one, as the coach who asked, under the ordinary policies.
 */

export type RefreshOutcome =
  | { state: "read"; newRaces: number; results: number }
  | { state: "fresh" }
  | { state: "off" }
  | { state: "busy" }
  | { state: "failed"; error: string };

const FORCED_GAP_MS = 10 * 60 * 1000;

export async function refreshRaces(
  ctx: OrgContext,
  riderId: string,
  options: { force?: boolean; today?: string; profile?: DcuProfile } = {},
): Promise<RefreshOutcome> {
  const rider = await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const [row] = await tx
      .select({ uciId: riders.uciId, at: riders.racesCheckedAt, birthYear: riders.birthYear })
      .from(riders)
      .where(eq(riders.id, riderId));
    return row;
  });
  if (!rider) throw new Refused("notFound");
  const uciId = rider.uciId;
  if (!uciId) throw new Refused("invalid", "noUciId");
  if (!readsRacesFor(env.DCU_RESULTS, uciId)) return { state: "off" };
  if (!staleSince(rider.at, options.force ? FORCED_GAP_MS : undefined)) return { state: "fresh" };

  const outcome = await exclusive(riderId, async (): Promise<RefreshOutcome> => {
    // A page read a moment ago, to check a new UCI ID, is not read twice.
    const read = options.profile
      ? { profile: options.profile }
      : await readProfile(uciId, rider.birthYear);
    if ("error" in read) {
      await note(ctx, riderId, read.error);
      return { state: "failed", error: read.error };
    }
    return store(ctx, riderId, read.profile, options.today ?? todayInCopenhagen());
  });
  return outcome === "busy" ? { state: "busy" } : outcome;
}

async function note(ctx: OrgContext, riderId: string, error: string) {
  await withOrgContext(ctx, (tx) =>
    tx
      .update(riders)
      .set({ racesCheckedAt: new Date(), racesError: error })
      .where(eq(riders.id, riderId)),
  );
}

async function store(
  ctx: OrgContext,
  riderId: string,
  profile: DcuProfile,
  today: string,
): Promise<RefreshOutcome> {
  const since = sinceFor(today);
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const dates = profile.results.map((r) => r.racedOn).filter((d) => d >= since);
    const last = dates.reduce((a, b) => (b > a ? b : a), since);
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
          or(isNull(calendarEvents.riderId), eq(calendarEvents.riderId, riderId)),
          lte(calendarEvents.startsOn, last),
          gte(calendarEvents.endsOn, since),
        ),
      );
    const knownRows = await tx
      .select({ ref: raceResults.sourceRef, eventId: raceResults.eventId })
      .from(raceResults)
      .where(and(eq(raceResults.riderId, riderId), eq(raceResults.source, "dcu")));
    const plan = planImport({
      riderId,
      results: profile.results,
      events,
      known: new Map(knownRows.map((k) => [k.ref, k.eventId])),
      since,
    });

    const made = new Map<string, string>();
    if (plan.newRaces.length > 0) {
      const rows = await tx
        .insert(calendarEvents)
        .values(
          plan.newRaces.map((race) => ({
            orgId: ctx.orgId,
            riderId,
            kind: "race",
            title: race.title,
            startsOn: race.on,
            endsOn: race.on,
            source: "dcu",
            createdBy: ctx.userId,
          })),
        )
        .returning({ id: calendarEvents.id, on: calendarEvents.startsOn });
      for (const row of rows) made.set(row.on, row.id);
    }

    const values = plan.results.map(({ event, ...result }) => ({
      orgId: ctx.orgId,
      riderId,
      eventId: "id" in event ? event.id : made.get(event.newOn)!,
      source: "dcu",
      ...result,
    }));
    if (values.length > 0) {
      await tx
        .insert(raceResults)
        .values(values)
        .onConflictDoUpdate({
          target: [raceResults.riderId, raceResults.source, raceResults.sourceRef],
          set: {
            race: sql`excluded.race`,
            discipline: sql`excluded.discipline`,
            raceClass: sql`excluded.race_class`,
            racedOn: sql`excluded.raced_on`,
            place: sql`excluded.place`,
            placeNote: sql`excluded.place_note`,
            resultUrl: sql`excluded.result_url`,
            updatedAt: new Date(),
          },
          // Unchanged rows are left alone, so the audit trail holds what changed.
          setWhere: sql`(race_results.place, race_results.place_note, race_results.race)
            is distinct from (excluded.place, excluded.place_note, excluded.race)`,
        });
    }
    await tx
      .update(riders)
      .set({ racesCheckedAt: new Date(), racesError: "" })
      .where(eq(riders.id, riderId));
    return { state: "read", newRaces: plan.newRaces.length, results: values.length };
  });
}

/**
 * When a coach opens Kadence, a page about riders, or the hourly job runs:
 * every rider among `riderIds` whose races are more than three hours old
 * goes in the line, as a job for the worker. Whatever goes wrong with a
 * reading is noted on the rider and never reaches the page.
 */
export async function refreshStaleRaces(ctx: OrgContext, riderIds?: string[]) {
  if (env.DCU_RESULTS === "off" || riderIds?.length === 0) return;
  const due = await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    return tx
      .select({ id: riders.id, uciId: riders.uciId, at: riders.racesCheckedAt })
      .from(riders)
      .where(and(eq(riders.archived, false), riderIds ? inArray(riders.id, riderIds) : undefined));
  }).catch(() => []);
  let index = 0;
  for (const rider of due) {
    if (!readsRacesFor(env.DCU_RESULTS, rider.uciId) || !staleSince(rider.at)) continue;
    const reading = { as: "coach" as const, userId: ctx.userId, riderId: rider.id };
    await enqueue(dcuReadRider, reading, {
      orgId: ctx.orgId,
      dedupeKey: readKey(reading),
      delayMs: spacedBy(index++),
    });
  }
}

const HOUR = 60 * 60 * 1000;

/**
 * A coach's visit, from the layout: the team's riders go in the line at
 * most once an hour per team, however many pages the coaches open
 * (docs/adr/0083). Before, every navigation read the team's riders to
 * find the stale ones; a reading stays fresh for three hours, so an hour
 * between looks misses nothing. The hour is counted with the rate
 * limits, so it holds across instances. The calendar and a rider's page
 * still ask for their own riders as they open.
 */
export async function refreshStaleRacesOnVisit(ctx: OrgContext) {
  if (env.DCU_RESULTS === "off") return;
  if (!(await rateLimit(`dcu-visit:${ctx.orgId}`, 1, HOUR)).allowed) return;
  await refreshStaleRaces(ctx);
}
