import {
  BUILD_ENDS,
  BUILD_STARTS,
  MIN_WINTER_SESSIONS_BY_CATEGORY,
} from "@/modules/dcu/strength-frequency";
import type { DcuCategory } from "@/modules/dcu/classes";

/**
 * Process goals (ADR 0013, ADR 0024): a count or a sum over a period,
 * read off what the rider did — never a result. `progressOf` counts a
 * goal from the rider's activities in its period; `dcuWinterGoal` is the
 * one goal Kadence proposes by itself, DCU's strength sessions a winter
 * for U17 and U19 (src/modules/dcu/strength-frequency.ts). The coach or
 * the rider says yes to it; nothing is created unasked.
 *
 * Pure: imports nothing from the database.
 */

export const GOAL_KINDS = [
  "strength_sessions",
  "bike_sessions",
  "bike_hours",
  "long_rides",
  "manual",
] as const;
export type GoalKind = (typeof GOAL_KINDS)[number];

export type GoalSpec = {
  kind: GoalKind;
  startsOn: string;
  endsOn: string;
  minHours: number | null;
  progress: number;
};

export type GoalActivity = { onDate: string; sport: string; movingSeconds: number };

export function progressOf(goal: GoalSpec, activities: readonly GoalActivity[]): number {
  if (goal.kind === "manual") return goal.progress;
  const inPeriod = activities.filter((a) => a.onDate >= goal.startsOn && a.onDate <= goal.endsOn);
  switch (goal.kind) {
    case "strength_sessions":
      return inPeriod.filter((a) => a.sport === "strength").length;
    case "bike_sessions":
      return inPeriod.filter((a) => a.sport === "bike").length;
    case "bike_hours":
      return (
        Math.round(
          inPeriod.filter((a) => a.sport === "bike").reduce((s, a) => s + a.movingSeconds, 0) / 360,
        ) / 10
      );
    case "long_rides":
      return inPeriod.filter(
        (a) => a.sport === "bike" && a.movingSeconds >= (goal.minHours ?? 3) * 3600,
      ).length;
  }
}

/** Where a goal stands: done, on its way, or not started; and how far in per cent, capped. */
export function goalShare(progress: number, target: number): number {
  return target > 0 ? Math.min(1, progress / target) : 0;
}

const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/**
 * DCU's winter strength goal for the season a date falls in: at least 30
 * sessions from 1 November to 15 March for U17 and U19. Null for a class
 * DCU sets no number for. The winter is named by the year it starts.
 */
export function dcuWinterGoal(
  category: DcuCategory,
  today: string,
): {
  kind: "strength_sessions";
  target: number;
  startsOn: string;
  endsOn: string;
  winter: number;
} | null {
  const target = MIN_WINTER_SESSIONS_BY_CATEGORY[category];
  if (target === null) return null;
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  // Before mid-March the winter that started last November is still on.
  const winter =
    month < BUILD_ENDS.month ||
    (month === BUILD_ENDS.month && Number(today.slice(8, 10)) <= BUILD_ENDS.day)
      ? year - 1
      : year;
  return {
    kind: "strength_sessions",
    target,
    startsOn: iso(winter, BUILD_STARTS.month, BUILD_STARTS.day),
    endsOn: iso(winter + 1, BUILD_ENDS.month, BUILD_ENDS.day),
    winter,
  };
}
