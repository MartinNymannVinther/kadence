import { and, eq, gte, lte } from "drizzle-orm";
import { activities } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { monthlyBikeHours, seasonRange, type RiddenMonth } from "./months";

export { monthlyBikeHours, seasonRange, type RiddenMonth };

/**
 * What a rider actually rode in a season, month by month, beside the plan
 * and DCU's hours on the season page; a month not ridden yet is 0.
 */

/** The rider's ridden season; RLS decides whether the caller may read it at all. */
export async function getSeasonRidden(
  ctx: OrgContext,
  riderId: string,
  seasonStartYear: number,
): Promise<RiddenMonth[]> {
  const { from, to } = seasonRange(seasonStartYear);
  const rows = await withOrgContext(ctx, (tx) =>
    tx
      .select({
        onDate: activities.onDate,
        sport: activities.sport,
        seconds: activities.movingSeconds,
      })
      .from(activities)
      .where(
        and(
          eq(activities.riderId, riderId),
          gte(activities.onDate, from),
          lte(activities.onDate, to),
        ),
      ),
  );
  return monthlyBikeHours(rows, seasonStartYear);
}
