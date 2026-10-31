import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { activities } from "@/core/db/schema";
import { addDaysIso } from "@/core/dates";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";

/**
 * Whether any ride in these riders' days came through Garmin, so a chart,
 * a total or a calendar made from them can say it is derived in part from
 * Garmin's data (src/modules/devices/attribution.ts). One `exists` under
 * the caller's own policies: a ride the caller may not read counts for
 * nothing, and nothing but the yes or no comes back.
 */
export async function garminRidesIn(
  ctx: OrgContext,
  range: { riderIds: string[]; from?: string; to?: string },
): Promise<boolean> {
  if (range.riderIds.length === 0) return false;
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx
      .select({ one: sql<number>`1` })
      .from(activities)
      .where(
        and(
          eq(activities.source, "garmin"),
          inArray(activities.riderId, range.riderIds),
          range.from ? gte(activities.onDate, range.from) : undefined,
          range.to ? lte(activities.onDate, range.to) : undefined,
        ),
      )
      .limit(1);
    return row !== undefined;
  });
}

/**
 * How far back a page's form, load and weeks reach: the fitness curve
 * carries a ride for weeks after it, so a ride from Garmin in the last
 * four months still shapes what the page shows.
 */
const LATELY_DAYS = 120;

/** `garminRidesIn` over the days a rider's page draws from, up to today. */
export function garminRidesLately(
  ctx: OrgContext,
  riderIds: string[],
  today: string,
): Promise<boolean> {
  return garminRidesIn(ctx, { riderIds, from: addDaysIso(today, -LATELY_DAYS), to: today });
}
