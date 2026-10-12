import { and, gte, inArray, lte } from "drizzle-orm";
import { activities, plannedSessions } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { seasonStartYear } from "@/modules/dcu";
import { framesIn } from "./frames";
import {
  seasonMonths,
  volumeOf,
  type SeasonFrame,
  type Volume,
  type VolumeActivity,
  type VolumeRange,
  type VolumeSession,
} from "./volume";
import type { Paradigm } from "@/modules/paradigms";

/**
 * The four numbers (ADR 0040) read from the database: each rider's
 * season plans for the seasons a range touches, the planned sessions and
 * the activities in it, in one transaction. RLS decides whose rows come
 * back; a rider the caller may not read has none and counts nothing.
 */

export type RiderData = {
  name: string;
  frameOf: (season: number) => SeasonFrame;
  sessions: VolumeSession[];
  activities: VolumeActivity[];
  /** The team's paradigm (ADR 0049), the same for every rider of the team. */
  paradigm: Paradigm | null;
};

/** Every rider's plans, sessions and activities for a range, as `volumeOf` wants them. */
export async function readFor(
  tx: AppTransaction,
  riderIds: string[],
  range: VolumeRange,
): Promise<Map<string, RiderData>> {
  const frames = await framesIn(tx, riderIds, {
    from: seasonStartYear(range.from),
    to: seasonStartYear(range.to),
  });
  const sessionRows = await tx
    .select({
      riderId: plannedSessions.riderId,
      onDate: plannedSessions.onDate,
      sport: plannedSessions.sport,
      plannedMinutes: plannedSessions.plannedMinutes,
      activityId: plannedSessions.activityId,
    })
    .from(plannedSessions)
    .where(
      and(
        inArray(plannedSessions.riderId, riderIds),
        gte(plannedSessions.onDate, range.from),
        lte(plannedSessions.onDate, range.to),
      ),
    );
  const activityRows = await tx
    .select({
      riderId: activities.riderId,
      onDate: activities.onDate,
      sport: activities.sport,
      seconds: activities.movingSeconds,
    })
    .from(activities)
    .where(
      and(
        inArray(activities.riderId, riderIds),
        gte(activities.onDate, range.from),
        lte(activities.onDate, range.to),
      ),
    );
  const out = new Map<string, RiderData>();
  for (const [id, rider] of frames.riders) {
    out.set(id, {
      ...rider,
      sessions: sessionRows
        .filter((s) => s.riderId === id)
        .map((s) => ({ ...s, done: s.activityId !== null })),
      activities: activityRows.filter((a) => a.riderId === id),
      paradigm: frames.paradigm,
    });
  }
  return out;
}

/** Each rider's four numbers over one range — a week in the calendar, say. */
export async function volumesFor(
  ctx: OrgContext,
  riderIds: string[],
  range: VolumeRange,
  today: string,
): Promise<Map<string, Volume>> {
  if (riderIds.length === 0) return new Map();
  const data = await withOrgContext(ctx, (tx) => readFor(tx, riderIds, range));
  return new Map([...data].map(([id, d]) => [id, volumeOf({ ...d, range, today })]));
}

/** One rider's season, month by month from October, for the season page. */
export async function seasonVolumes(
  ctx: OrgContext,
  riderId: string,
  season: number,
  today: string,
): Promise<Array<{ month: number; volume: Volume }>> {
  const months = seasonMonths(season);
  const range = { from: months[0]!.from, to: months.at(-1)!.to };
  const data = (await withOrgContext(ctx, (tx) => readFor(tx, [riderId], range))).get(riderId);
  if (!data) return [];
  return months.map((m) => ({ month: m.month, volume: volumeOf({ ...data, range: m, today }) }));
}

/**
 * The team's season at a glance: for each rider, this month and the
 * season so far (October to today), from one read of the season so far
 * and the rest of this month.
 */
export async function teamSeasonVolumes(
  ctx: OrgContext,
  riderIds: string[],
  today: string,
): Promise<Map<string, { month: Volume; toDate: Volume }>> {
  if (riderIds.length === 0) return new Map();
  const season = seasonStartYear(today);
  const month = seasonMonths(season).find((m) => today >= m.from && today <= m.to)!;
  const toDate = { from: `${season}-10-01`, to: today };
  const data = await withOrgContext(ctx, (tx) =>
    readFor(tx, riderIds, { from: toDate.from, to: month.to }),
  );
  return new Map(
    [...data].map(([id, d]) => [
      id,
      {
        month: volumeOf({ ...d, range: month, today }),
        toDate: volumeOf({ ...d, range: toDate, today }),
      },
    ]),
  );
}
