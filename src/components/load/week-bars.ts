import { isClassBasis, weeklyCorridor } from "@/modules/dcu";
import type { RiderInsight } from "@/modules/insight/rider";

/**
 * The weekly hours chart's rows, from a rider's insight: bike hours ridden
 * each week, what is still planned this week, and DCU's corridor for the
 * rider's class in that week (it moves with the months). Only bike hours
 * count toward DCU's hours. Pure.
 */

export type WeekBar = {
  monday: string;
  done: number;
  /** Bike hours still planned; only the current week has any. */
  planned: number;
  corridor: { low: number; target: number; high: number } | null;
  current: boolean;
};

export function weekBars(insight: Pick<RiderInsight, "weeks" | "week" | "basis">): WeekBar[] {
  const basis = isClassBasis(insight.basis) ? insight.basis : null;
  return insight.weeks.map((week) => {
    const current = week.monday === insight.week.monday;
    const corridor = basis ? weeklyCorridor(basis, week.monday) : null;
    return {
      monday: week.monday,
      done: week.bikeHours,
      planned: current ? insight.week.plannedBikeHours : 0,
      corridor: corridor
        ? { low: corridor.low, target: corridor.target, high: corridor.high }
        : null,
      current,
    };
  });
}
