import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { addDaysIso, mondayOf } from "@/core/dates";
import { calendarEvents, plannedSessions } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import {
  MID_ZONE_WEEKS,
  countIntensity,
  weeklyIntensity,
  type IntensityCount,
  type IntensityRace,
  type IntensitySession,
} from "@/modules/load";
import { teamPlanning } from "@/modules/team/settings";
import { readStructure } from "@/modules/workouts/structure";

/**
 * The planned bike sessions and race days behind "Intensitet uge for uge"
 * and the middle-zone flag (docs/adr/0053; src/modules/load/intensity.ts).
 * RLS decides whose: a coach reads the team's, a rider their own, a parent
 * their child's.
 */

export type RiderIntensityRows = {
  sessions: (IntensitySession & { riderId: string })[];
  /** A team race has riderId null and is in every rider's calendar. */
  races: (IntensityRace & { riderId: string | null })[];
};

/** The bike sessions planned from `from` to `to`, and the races overlapping it. */
export async function readIntensity(
  tx: AppTransaction,
  riderIds: readonly string[],
  from: string,
  to: string,
): Promise<RiderIntensityRows> {
  if (riderIds.length === 0) return { sessions: [], races: [] };
  const sessions = await tx
    .select({
      riderId: plannedSessions.riderId,
      onDate: plannedSessions.onDate,
      structure: plannedSessions.structure,
    })
    .from(plannedSessions)
    .where(
      and(
        inArray(plannedSessions.riderId, [...riderIds]),
        eq(plannedSessions.sport, "bike"),
        gte(plannedSessions.onDate, from),
        lte(plannedSessions.onDate, to),
      ),
    );
  const races = await tx
    .select({
      riderId: calendarEvents.riderId,
      startsOn: calendarEvents.startsOn,
      endsOn: calendarEvents.endsOn,
    })
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.kind, "race"),
        lte(calendarEvents.startsOn, to),
        gte(calendarEvents.endsOn, from),
        or(isNull(calendarEvents.riderId), inArray(calendarEvents.riderId, [...riderIds])),
      ),
    );
  return {
    sessions: sessions.map((s) => ({ ...s, structure: readStructure(s.structure, "bike") })),
    races,
  };
}

/** One rider's rows out of a team's. */
export function forRider(rows: RiderIntensityRows, riderId: string) {
  return {
    sessions: rows.sessions.filter((s) => s.riderId === riderId),
    races: rows.races.filter((r) => r.riderId === null || r.riderId === riderId),
  };
}

/** The flag's window: this week and the three before, to this Sunday. */
export function flagWindow(todayIso: string): { from: string; to: string } {
  const monday = mondayOf(todayIso);
  return { from: addDaysIso(monday, -7 * (MID_ZONE_WEEKS - 1)), to: addDaysIso(monday, 6) };
}

/** Weeks shown on the season page: four before this one, this one, and three ahead. */
const WEEKS_BEFORE = 4;
const WEEKS_AHEAD = 3;

export type IntensityWeeks = {
  weeks: { monday: string; count: IntensityCount }[];
  /** The flag's four weeks together. */
  recent: IntensityCount;
  lowIntensityFirst: boolean;
};

export async function intensityWeeks(
  ctx: OrgContext,
  riderId: string,
  todayIso: string,
): Promise<IntensityWeeks> {
  const monday = mondayOf(todayIso);
  const mondays = Array.from({ length: WEEKS_BEFORE + 1 + WEEKS_AHEAD }, (_, i) =>
    addDaysIso(monday, 7 * (i - WEEKS_BEFORE)),
  );
  return withOrgContext(ctx, async (tx) => {
    const rows = await readIntensity(tx, [riderId], mondays[0]!, addDaysIso(mondays.at(-1)!, 6));
    const { lowIntensityFirst } = await teamPlanning(tx, ctx.orgId);
    const window = flagWindow(todayIso);
    return {
      weeks: weeklyIntensity(rows.sessions, rows.races, mondays),
      recent: countIntensity(rows.sessions, rows.races, window.from, window.to),
      lowIntensityFirst,
    };
  });
}
