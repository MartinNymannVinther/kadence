import { addDaysIso, mondayOf } from "@/core/dates";
import type { ClassBasis } from "./classes";

/**
 * DCU's 2025 hours: how many hours on the bike a rider in each class and
 * year in it should ride each month, the source of the season plan
 * (ADR 0014). One table, "TRÆNINGSANBEFALINGER - LANDEVEJ 2025"
 * (Landevej_traeningsanbefalinger_2025.pdf p. 1), read from the rendered
 * page and checked against its own sums: every column's months add up to
 * its printed "Nov-mar" and "Nov-sep" (tests/dcu/hours.test.ts).
 *
 * October is "pause + frit" for every class, with no hours: Kadence plans
 * it as 0 and says so rather than inventing a number. The table also
 * prints hours per day per month; those are the month's hours over its
 * calendar days, rounded (45 h / 28 days = 1.6 in February), a single
 * figure and not a range, so Kadence spreads the month's hours itself.
 *
 * Where the 2016 compendia disagree — their own 2016 table, and "72-78
 * timer i marts" for U19 (DCU_U17_kompendium_2016.pdf p. 12-13;
 * DCU_U19_kompendium_2016.pdf p. 13-14) — these hours win, as CLAUDE.md
 * decides.
 *
 * Pure: imports nothing from the database.
 */

/** Hours per month, November to September, in the table's order. */
export const DCU_HOURS_2025: Record<ClassBasis, readonly number[]> = {
  // Landevej_traeningsanbefalinger_2025.pdf p. 1, columns "Timer/måned"
  "U17-1": [21, 34, 43, 45, 50, 42, 43, 38, 46, 37, 30],
  "U17-2": [27, 40, 50, 50, 56, 46, 48, 42, 52, 43, 36],
  "U19-1": [34, 46, 56, 56, 62, 52, 54, 46, 56, 50, 42],
  "U19-2": [38, 54, 62, 60, 68, 60, 60, 50, 66, 56, 48],
  "U23-1": [44, 64, 70, 64, 70, 66, 68, 54, 72, 68, 54],
  "U23-2": [54, 70, 76, 70, 74, 70, 70, 60, 78, 70, 60],
  "U23-3": [60, 76, 84, 75, 80, 74, 76, 64, 86, 78, 66],
  "U23-4": [68, 84, 90, 80, 84, 78, 80, 66, 92, 80, 68],
};

/** The sums the table prints under each column, for checking the months against. */
export const DCU_TOTALS_2025: Record<ClassBasis, { novMar: number; novSep: number }> = {
  // Landevej_traeningsanbefalinger_2025.pdf p. 1, rows "Nov-mar" and "Nov-sep"
  "U17-1": { novMar: 193, novSep: 429 },
  "U17-2": { novMar: 223, novSep: 490 },
  "U19-1": { novMar: 254, novSep: 554 },
  "U19-2": { novMar: 282, novSep: 622 },
  "U23-1": { novMar: 312, novSep: 694 },
  "U23-2": { novMar: 344, novSep: 752 },
  "U23-3": { novMar: 375, novSep: 819 },
  "U23-4": { novMar: 406, novSep: 870 },
};

function checkMonth(month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12)
    throw new RangeError(`Not a month: ${month}`);
}

/** DCU's hours for a month (1–12); October, "pause + frit", is 0. */
export function monthHours(basis: ClassBasis, month: number): number {
  checkMonth(month);
  // November is index 0 of the table, September 10; October falls off the end.
  return DCU_HOURS_2025[basis][(month + 1) % 12] ?? 0;
}

/** DCU's hours for the whole season, November to September. */
export function seasonHours(basis: ClassBasis): number {
  return DCU_HOURS_2025[basis].reduce((sum, h) => sum + h, 0);
}

/**
 * How wide the weekly corridor is either side of the target: ±20 %.
 * Kadence's choice, not DCU's. DCU gives hours per month and a single
 * average per day, no range; what it does say is that a rider should
 * train "hverken … meget mere eller meget mindre" than the
 * recommendations (DCU_U17_kompendium_2016.pdf p. 12), and the corridor
 * is Kadence's reading of "not much more or less". A guardrail shown to
 * the coach, never enforced.
 */
export const CORRIDOR_BAND = 0.2;

export type WeeklyCorridor = {
  low: number;
  target: number;
  high: number;
  /** Days of the week in October, DCU's "pause + frit": no hours, free riding. */
  breakDays: number;
};

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The hours a rider should ride in a week, Monday to Sunday, for the week
 * holding `weekMondayIso` (any day of the week will do). Kadence's
 * derivation, not a DCU number: each day carries its month's hours over
 * the month's calendar days — the same average DCU prints as hours per
 * day — and the week is the sum of its seven days, so a week across two
 * months weighs each by the days it has in it. Low and high are the
 * target ∓ `CORRIDOR_BAND`. Hours are unrounded; format at the edge.
 */
export function weeklyCorridor(basis: ClassBasis, weekMondayIso: string): WeeklyCorridor {
  return corridorOf((month) => monthHours(basis, month), weekMondayIso);
}

/**
 * The same derivation for any table of month hours with October as its
 * break: Kadence's own senior profiles use it too
 * (src/modules/paradigms/senior.ts), so their corridor is shaped as DCU's.
 */
export function corridorOf(
  hoursOfMonth: (month: number) => number,
  weekMondayIso: string,
): WeeklyCorridor {
  const monday = mondayOf(weekMondayIso);
  let target = 0;
  let breakDays = 0;
  for (let d = 0; d < 7; d++) {
    const [year, month] = addDaysIso(monday, d).split("-").map(Number) as [number, number];
    if (month === 10) breakDays++;
    target += hoursOfMonth(month) / daysInMonth(year, month);
  }
  return {
    low: target * (1 - CORRIDOR_BAND),
    target,
    high: target * (1 + CORRIDOR_BAND),
    breakDays,
  };
}
