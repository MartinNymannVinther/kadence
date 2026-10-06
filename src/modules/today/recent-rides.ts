import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { activities, plannedSessions } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";

/**
 * What a rider's Today asks about their own rides (docs/adr/0062): the
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
  /** The ride's own title, or the session it was ridden for; may be empty. */
  title: string;
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
  const rows = await withOrgContext(ctx, (tx) =>
    tx
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
      .limit(20),
  );
  return rows.map(({ sessionTitle, ...r }) => ({
    ...r,
    title: r.title || sessionTitle || "",
  }));
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
