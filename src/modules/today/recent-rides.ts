import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { activities, plannedSessions } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { nameRides } from "@/modules/activities/names";
import type { RideName } from "@/modules/activities/ride-name";

/**
 * What a rider's Today asks about their own rides (docs/adr/0063): the
 * last few days' rides, for "Hvor hårdt føltes turen?", and whether any
 * ride is in at all, for the first steps. Read under the caller's RLS, so
 * a rider reads their own and nobody else's; the page asks only for the
 * caller's own rider.
 */

export type RecentRide = {
  id: string;
  onDate: string;
  startedAt: Date;
  sport: string;
  /** What the ride is called on the page (docs/adr/0098). */
  name: RideName;
  movingSeconds: number;
  distanceM: number | null;
  rpe: number | null;
  feel: number | null;
  note: string;
  load: number | null;
  source: string;
};

export async function recentRides(
  ctx: OrgContext,
  riderId: string,
  range: { from: string; to: string },
): Promise<RecentRide[]> {
  return withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .select({
        id: activities.id,
        onDate: activities.onDate,
        startedAt: activities.startedAt,
        sport: activities.sport,
        title: activities.title,
        sessionTitle: plannedSessions.title,
        movingSeconds: activities.movingSeconds,
        distanceM: activities.distanceM,
        rpe: activities.rpe,
        feel: activities.feel,
        note: activities.note,
        load: activities.load,
        source: activities.source,
      })
      .from(activities)
      .leftJoin(plannedSessions, eq(plannedSessions.activityId, activities.id))
      .where(
        and(
          eq(activities.riderId, riderId),
          gte(activities.onDate, range.from),
          lte(activities.onDate, range.to),
        ),
      )
      .orderBy(desc(activities.startedAt))
      .limit(20);
    const names = await nameRides(tx, rows);
    return rows.map(({ sessionTitle: _session, title: _title, ...r }) => ({
      ...r,
      name: names.get(r.id)!,
    }));
  });
}

/** Whether the rider has any ride in Kadence yet. */
export async function hasAnyRide(ctx: OrgContext, riderId: string): Promise<boolean> {
  const rows = await withOrgContext(ctx, (tx) =>
    tx
      .select({ one: sql<number>`1` })
      .from(activities)
      .where(eq(activities.riderId, riderId))
      .limit(1),
  );
  return rows.length > 0;
}
