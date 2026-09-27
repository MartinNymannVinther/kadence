import { SEASON_MONTHS, type ClassBasis } from "./classes";
import { monthHours } from "./hours";
import { MONTH_NOTES, phaseOf, type Phase } from "./phases";

/**
 * A season plan filled from DCU, and how far a plan has moved from it.
 *
 * A new season plan starts as DCU's 2025 hours for the rider's class and
 * year in it, month by month from October — "pause + frit", 0 hours — to
 * September (Landevej_traeningsanbefalinger_2025.pdf p. 1), each month
 * with its phase and DCU's guidance for it. The coach may change any
 * month; `compareToDcu` then gives, per month, the planned hours beside
 * DCU's, so every view of a plan can show the deviation (ADR 0014: a
 * deviation is always shown, never hidden).
 *
 * Pure: imports nothing from the database.
 */

export type SeasonPlanMonth = {
  /** 1–12. */
  month: number;
  hours: number;
  phase: Phase;
  /** DCU's guidance for the month, in English, with its source. */
  note: string;
};

export type SeasonPlan = {
  basis: ClassBasis;
  seasonStartYear: number;
  /** Twelve months, October first. */
  months: SeasonPlanMonth[];
};

export function buildSeasonPlan(basis: ClassBasis, seasonStartYear: number): SeasonPlan {
  return {
    basis,
    seasonStartYear,
    months: SEASON_MONTHS.map((month) => ({
      month,
      hours: monthHours(basis, month),
      phase: phaseOf(month),
      note: MONTH_NOTES[month] ?? "",
    })),
  };
}

export type MonthDeviation = {
  month: number;
  planned: number;
  dcu: number;
  /** Planned minus DCU, in hours. */
  diff: number;
  /** The difference in percent of DCU's hours; null when DCU plans none (October). */
  diffPct: number | null;
};

/**
 * Each planned month beside DCU's hours for the basis, in the order
 * given. Unrounded; format at the edge.
 */
export function compareToDcu(
  months: ReadonlyArray<{ month: number; hours: number }>,
  basis: ClassBasis,
): MonthDeviation[] {
  return months.map(({ month, hours }) => {
    const dcu = monthHours(basis, month);
    const diff = hours - dcu;
    return { month, planned: hours, dcu, diff, diffPct: dcu === 0 ? null : (diff / dcu) * 100 };
  });
}
