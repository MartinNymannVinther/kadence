import { addDaysIso, mondayOf } from "@/core/dates";
import { seasonStartYear } from "@/modules/dcu";

/**
 * The calendar's month and season as arithmetic (docs/adr/0093): which
 * month or season a URL asks for, the Monday-first weeks a month is
 * drawn in, and the twelve months of a season from October. Dates are
 * Copenhagen days as ISO strings (src/core/dates.ts); a month is
 * "yyyy-mm", a season the year its October falls in.
 *
 * Pure: imports nothing from the database.
 */

export type CalendarScale = "week" | "month" | "year";

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** The scale a `?view=` asks for; the week for anything else, the team's week included. */
export function scaleFrom(view: string | undefined): CalendarScale {
  return view === "month" || view === "year" ? view : "week";
}

/** The month a `?month=` asks for; today's month when it asks for nothing sensible. */
export function monthFrom(param: string | undefined, fallback: string): string {
  const match = param ? MONTH.exec(param) : null;
  if (match && Number(match[1]) >= 2000 && Number(match[1]) <= 2100) return param!;
  return fallback.slice(0, 7);
}

function daysIn(month: string): number {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** The month `n` months from `month`: shiftMonth("2026-12", 1) is "2027-01". */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const index = y * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** The month's first and last day. */
export function monthBounds(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: `${month}-${String(daysIn(month)).padStart(2, "0")}` };
}

export type GridDay = { date: string; inMonth: boolean };
export type GridWeek = { monday: string; days: GridDay[] };

/**
 * The weeks a month is drawn in, Monday first: from the Monday on or
 * before the 1st to the Sunday on or after the last day, so four to six
 * rows. The days of the months either side are there, marked as outside.
 */
export function monthWeeks(month: string): GridWeek[] {
  const { from, to } = monthBounds(month);
  const weeks: GridWeek[] = [];
  for (let monday = mondayOf(from); monday <= to; monday = addDaysIso(monday, 7)) {
    weeks.push({
      monday,
      days: Array.from({ length: 7 }, (_, i) => {
        const date = addDaysIso(monday, i);
        return { date, inMonth: date.slice(0, 7) === month };
      }),
    });
  }
  return weeks;
}

/** The whole grid's first and last day: what a month view reads. */
export function gridBounds(month: string): { from: string; to: string } {
  const weeks = monthWeeks(month);
  return { from: weeks[0]!.monday, to: addDaysIso(weeks.at(-1)!.monday, 6) };
}

/** The season a `?year=` asks for — the year its October is in; today's season otherwise. */
export function seasonFrom(param: string | undefined, today: string): number {
  const year = Number(param);
  if (param && /^\d{4}$/.test(param) && year >= 2000 && year <= 2100) return year;
  return seasonStartYear(today);
}

/** The season a month belongs to: October to September. */
export function seasonOfMonth(month: string): number {
  return seasonStartYear(`${month}-01`);
}

/** The twelve months of a season, October first: "2026-10" … "2027-09". */
export function seasonMonthKeys(season: number): string[] {
  return Array.from({ length: 12 }, (_, i) => shiftMonth(`${season}-10`, i));
}

/** The season's first and last day. */
export function seasonBounds(season: number): { from: string; to: string } {
  return { from: `${season}-10-01`, to: `${season + 1}-09-30` };
}

/** "2026/27", as a season is said. */
export function seasonLabel(season: number): string {
  return `${season}/${String((season + 1) % 100).padStart(2, "0")}`;
}

/**
 * The day the other scales open on, from the range shown: today when it
 * is inside, otherwise a week's Thursday (the day ISO weeks belong to
 * their month and year by) or a month's or season's first day.
 */
export function anchorDate(range: { from: string; to: string }, today: string): string {
  if (today >= range.from && today <= range.to) return today;
  const span = Math.round((Date.parse(range.to) - Date.parse(range.from)) / 86_400_000);
  return span === 6 ? addDaysIso(range.from, 3) : range.from;
}
