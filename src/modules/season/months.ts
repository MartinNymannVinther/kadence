import { COUNTS_TOWARD_DCU_HOURS, SEASON_MONTHS } from "@/modules/dcu";

/**
 * A season's ridden hours, month by month, from activities already read:
 * the third column on the season page beside the plan and DCU's hours.
 * Only hours on the bike count toward DCU's hours (src/modules/dcu/rules.ts).
 *
 * Pure: imports nothing from the database.
 */

export type RiddenMonth = { month: number; hours: number };

/** The first and last day of the season that starts in October of `seasonStartYear`. */
export function seasonRange(seasonStartYear: number): { from: string; to: string } {
  return { from: `${seasonStartYear}-10-01`, to: `${seasonStartYear + 1}-09-30` };
}

/**
 * Bike hours per month of the season, October first, from activities
 * already read: each counts in the month of the day it was ridden, and
 * activities outside the season or off the bike are left out. Pure.
 */
export function monthlyBikeHours(
  rows: ReadonlyArray<{ onDate: string; sport: string; seconds: number }>,
  seasonStartYear: number,
): RiddenMonth[] {
  const { from, to } = seasonRange(seasonStartYear);
  const seconds = new Map<number, number>();
  for (const row of rows) {
    if (row.onDate < from || row.onDate > to) continue;
    if (!COUNTS_TOWARD_DCU_HOURS[row.sport as "bike"]) continue;
    const month = Number(row.onDate.slice(5, 7));
    seconds.set(month, (seconds.get(month) ?? 0) + Math.max(0, row.seconds));
  }
  return SEASON_MONTHS.map((month) => ({
    month,
    hours: Math.round(((seconds.get(month) ?? 0) / 3600) * 10) / 10,
  }));
}
