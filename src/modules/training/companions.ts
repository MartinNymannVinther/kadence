import { and, eq, inArray } from "drizzle-orm";
import { activities, riders, type ActivityRow } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { rideNamesIn } from "@/modules/activities/names";
import type { RideName } from "@/modules/activities/ride-name";
import { companionsOf, firstFix, type RideOutline } from "@/modules/load/together";

/**
 * The other riders' rides that were the same ride as this one, for the
 * coach to lay over each other (src/modules/load/together.ts). Read
 * through RLS: a rider sees no teammate's ride, so for a rider there are
 * never any companions, and the section stays away (ADR 0011).
 */

export type Companion = {
  activity: ActivityRow;
  riderName: string;
  /** What the ride is called on the pages (docs/adr/0098). */
  name: RideName;
};

function outline(a: ActivityRow): RideOutline {
  return {
    id: a.id,
    riderId: a.riderId,
    onDate: a.onDate,
    sport: a.sport,
    startedAt: a.startedAt,
    distanceM: a.distanceM,
    start: firstFix(a.streams),
  };
}

export async function listCompanions(ctx: OrgContext, activity: ActivityRow): Promise<Companion[]> {
  return withOrgContext(ctx, async (tx) => {
    const sameDay = await tx
      .select({ activity: activities, riderName: riders.name })
      .from(activities)
      .innerJoin(riders, eq(riders.id, activities.riderId))
      .where(and(eq(activities.onDate, activity.onDate), eq(activities.sport, "bike")));
    const matches = companionsOf(
      outline(activity),
      sameDay.map((row) => ({ ...outline(row.activity), row })),
    );
    const rows = matches.map(({ row }) => row);
    const names = await rideNamesIn(
      tx,
      rows.map((r) => r.activity.id),
    );
    return rows
      .map((r) => ({ ...r, name: names.get(r.activity.id)! }))
      .sort((a, b) => a.riderName.localeCompare(b.riderName, "da"));
  });
}

/** The rides to compare, by id, each with its rider's name — only those the caller may read. */
export async function getRidesToCompare(ctx: OrgContext, ids: string[]): Promise<Companion[]> {
  if (ids.length === 0) return [];
  return withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .select({ activity: activities, riderName: riders.name })
      .from(activities)
      .innerJoin(riders, eq(riders.id, activities.riderId))
      .where(inArray(activities.id, ids));
    const names = await rideNamesIn(
      tx,
      rows.map((r) => r.activity.id),
    );
    return rows.map((r) => ({ ...r, name: names.get(r.activity.id)! }));
  });
}
