import { and, asc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import {
  activities,
  calendarEvents,
  checkins,
  plannedSessions,
  riders,
  type CheckinRow,
  type RiderRow,
} from "@/core/db/schema";
import type { AppTransaction } from "@/core/db/tenant";

/**
 * What the insight reads from the database, in one pass per team: the
 * riders the caller may see, their activities and planned sessions over
 * the window, and their check-ins. RLS decides who is in it — a coach
 * gets the team, a rider themselves, a parent their children, and the
 * parent's check-ins only when the rider shares them (ADR 0011).
 */

export type InsightActivity = {
  id: string;
  riderId: string;
  onDate: string;
  sport: "bike" | "strength" | "other";
  seconds: number;
  distanceM: number | null;
  load: number | null;
};

export type InsightSession = {
  riderId: string;
  onDate: string;
  sport: string;
  plannedMinutes: number;
  plannedLoad: number | null;
  activityId: string | null;
};

/** An A or B race ahead, the rider's own or the team's (riderId null). */
export type InsightRace = {
  riderId: string | null;
  title: string;
  startsOn: string;
  priority: "A" | "B";
};

export type Gathered = {
  riders: RiderRow[];
  activities: InsightActivity[];
  sessions: InsightSession[];
  checkins: CheckinRow[];
  races: InsightRace[];
};

export async function gather(
  tx: AppTransaction,
  range: {
    from: string;
    to: string;
    riderIds?: string[];
    /** How far ahead planned sessions and A/B races are read, for form ahead. */
    aheadTo?: string;
  },
): Promise<Gathered> {
  const riderRows = await tx
    .select()
    .from(riders)
    .where(
      and(
        eq(riders.archived, false),
        range.riderIds
          ? inArray(riders.id, range.riderIds.length ? range.riderIds : [""])
          : undefined,
      ),
    )
    .orderBy(asc(riders.name));
  const ids = riderRows.map((r) => r.id);
  if (ids.length === 0)
    return { riders: [], activities: [], sessions: [], checkins: [], races: [] };
  const sessionsTo = range.aheadTo && range.aheadTo > range.to ? range.aheadTo : range.to;

  const acts = await tx
    .select({
      id: activities.id,
      riderId: activities.riderId,
      onDate: activities.onDate,
      sport: activities.sport,
      seconds: activities.movingSeconds,
      distanceM: activities.distanceM,
      load: activities.load,
    })
    .from(activities)
    .where(
      and(
        inArray(activities.riderId, ids),
        gte(activities.onDate, range.from),
        lte(activities.onDate, range.to),
      ),
    );
  const sessions = await tx
    .select({
      riderId: plannedSessions.riderId,
      onDate: plannedSessions.onDate,
      sport: plannedSessions.sport,
      plannedMinutes: plannedSessions.plannedMinutes,
      plannedLoad: plannedSessions.plannedLoad,
      activityId: plannedSessions.activityId,
    })
    .from(plannedSessions)
    .where(
      and(
        inArray(plannedSessions.riderId, ids),
        gte(plannedSessions.onDate, range.from),
        lte(plannedSessions.onDate, sessionsTo),
      ),
    );
  const checks = await tx
    .select()
    .from(checkins)
    .where(
      and(
        inArray(checkins.riderId, ids),
        gte(checkins.onDate, range.from),
        lte(checkins.onDate, range.to),
      ),
    )
    .orderBy(asc(checkins.onDate));
  const races = range.aheadTo
    ? await tx
        .select({
          riderId: calendarEvents.riderId,
          title: calendarEvents.title,
          startsOn: calendarEvents.startsOn,
          priority: calendarEvents.priority,
        })
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.kind, "race"),
            inArray(calendarEvents.priority, ["A", "B"]),
            gte(calendarEvents.startsOn, range.from),
            lte(calendarEvents.startsOn, range.aheadTo),
            or(isNull(calendarEvents.riderId), inArray(calendarEvents.riderId, ids)),
          ),
        )
    : [];
  return {
    riders: riderRows,
    activities: acts.map((a) => ({ ...a, sport: a.sport as InsightActivity["sport"] })),
    sessions,
    checkins: checks,
    races: races.map((r) => ({ ...r, priority: r.priority as "A" | "B" })),
  };
}
