import { and, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { Refused } from "@/core/action";
import { env } from "@/core/env";
import { calendarEvents, raceResults, riders } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { todayInCopenhagen } from "@/core/dates";
import { rateLimit } from "@/core/rate-limit";
import { DeviceHttpError, loggable } from "@/modules/devices/http";
import { requireCoach } from "@/modules/team/access";
import { DcuPageError, parseDcuProfile, type DcuProfile } from "./dcu-profile";
import { fetchDcuProfile } from "./fetch-dcu";
import { planImport } from "./plan";
import { readsRacesFor } from "./switch";

/**
 * Reads a rider's races from Cykling Danmark and puts them in the
 * calendar (ADR 0039): a race Kadence makes for the day where the
 * calendar has none, and the result on it for the coach.
 *
 * Kadence has no scheduled job, so this runs when a coach asks — the
 * button on the rider's page — and, at most once a day per rider, after a
 * coach's page has been answered. It is polite to the portal: one page per
 * rider, never twice in ten minutes, never more than a few a minute for
 * the whole installation, and one at a time per rider.
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

const DAY_MS = 24 * 60 * 60 * 1000;
const FORCED_GAP_MS = 10 * 60 * 1000;
const PER_MINUTE = 6;
const inFlight = new Set<string>();

/** Why the read failed, as the short word stored on the rider and shown to the coach. */
function errorWord(error: unknown): string {
  if (error instanceof DcuPageError) return error.code;
  if (error instanceof DeviceHttpError) {
    if (error.code === "status" && error.status === 404) return "unknown";
    return error.code;
  }
  return "generic";
}

/** The first of January of last year: the season before and this one. */
function sinceFor(today: string): string {
  return `${Number(today.slice(0, 4)) - 1}-01-01`;
}

export async function refreshRaces(
  ctx: OrgContext,
  riderId: string,
  options: { force?: boolean; today?: string } = {},
): Promise<RefreshOutcome> {
  const rider = await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const [row] = await tx
      .select({ uciId: riders.uciId, at: riders.racesCheckedAt })
      .from(riders)
      .where(eq(riders.id, riderId));
    return row;
  });
  if (!rider) throw new Refused("notFound");
  if (!rider.uciId) throw new Refused("invalid", "noUciId");
  if (!readsRacesFor(env.DCU_RESULTS, rider.uciId)) return { state: "off" };
  const gap = options.force ? FORCED_GAP_MS : DAY_MS;
  if (rider.at && Date.now() - rider.at.getTime() < gap) return { state: "fresh" };
  if (inFlight.has(riderId)) return { state: "busy" };
  if (!rateLimit("dcu-results", PER_MINUTE, 60_000).allowed) return { state: "busy" };

  inFlight.add(riderId);
  try {
    let profile: DcuProfile;
    try {
      profile = parseDcuProfile(await fetchDcuProfile(rider.uciId), rider.uciId);
      // Rows on the page and not one that reads: the page has changed, and
      // an import of nothing would say the rider rode nothing.
      if (profile.results.length === 0 && profile.skipped > 0)
        throw new DcuPageError("not_profile");
    } catch (error) {
      const word = errorWord(error);
      console.warn("dcu results: read failed", loggable(error));
      await note(ctx, riderId, word);
      return { state: "failed", error: word };
    }
    return await store(ctx, riderId, profile, options.today ?? todayInCopenhagen());
  } finally {
    inFlight.delete(riderId);
  }
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
 * After a coach's page: the riders whose races were last read more than a
 * day ago, a few at a time. Whatever goes wrong is noted on the rider and
 * never reaches the page, which has already been answered.
 */
export async function refreshStaleRaces(ctx: OrgContext, riderIds: string[], max = 3) {
  if (env.DCU_RESULTS === "off" || riderIds.length === 0) return;
  const due = await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    return tx
      .select({ id: riders.id, uciId: riders.uciId, at: riders.racesCheckedAt })
      .from(riders)
      .where(and(inArray(riders.id, riderIds), eq(riders.archived, false)));
  }).catch(() => []);
  const stale = due.filter(
    (r) =>
      readsRacesFor(env.DCU_RESULTS, r.uciId) && (!r.at || Date.now() - r.at.getTime() >= DAY_MS),
  );
  for (const rider of stale.slice(0, max)) {
    await refreshRaces(ctx, rider.id).catch((error: unknown) =>
      console.warn("dcu results: refresh failed", loggable(error)),
    );
  }
}
