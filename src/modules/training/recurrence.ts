import { z } from "zod";
import { addDaysIso, diffDays, mondayOf } from "@/core/dates";
import { MIN_HOURS_BETWEEN_STRENGTH, strengthFrequency } from "@/modules/dcu";

/**
 * "Gentag" (ADR 0041): the same session on chosen weekdays from a first
 * day until a last, for one rider or several — the strength session every
 * Tuesday and Thursday through the winter. What it makes is ordinary
 * planned sessions with a series key; this file only says which days, how
 * many, and what the guardrails would say about a strength series.
 *
 * Pure: imports nothing from the database.
 */

/** Half a year at most: a winter's strength from November to mid-March is twenty weeks. */
export const MAX_REPEAT_WEEKS = 26;
/** The most sessions one press may write, every rider's copies together. */
export const MAX_SERIES_ROWS = 2000;

/** 1 is Monday, 7 Sunday — ISO's numbering. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export const RepeatInput = z.object({
  weekdays: z
    .array(z.number().int().min(1).max(7))
    .min(1)
    .max(7)
    .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
  until: z.iso.date(),
});
export type Repeat = z.infer<typeof RepeatInput>;

export function isoWeekday(dateIso: string): number {
  return diffDays(mondayOf(dateIso), dateIso) + 1;
}

/** Why a repeat cannot be made, or null when it can. */
export function repeatProblem(start: string, repeat: Repeat): "order" | "tooLong" | "empty" | null {
  if (repeat.until < start) return "order";
  if (diffDays(start, repeat.until) >= MAX_REPEAT_WEEKS * 7) return "tooLong";
  return repeatDates(start, repeat).length === 0 ? "empty" : null;
}

/**
 * The days of the series, in order: every day from `start` to `until`,
 * both included, that falls on one of the weekdays. The first day itself
 * is in it only if its weekday is chosen.
 */
export function repeatDates(start: string, repeat: Repeat): string[] {
  const out: string[] = [];
  const last = repeat.until;
  for (let d = start; d <= last && out.length < MAX_REPEAT_WEEKS * 7; d = addDaysIso(d, 1))
    if (repeat.weekdays.includes(isoWeekday(d))) out.push(d);
  return out;
}

export type StrengthNote =
  /** Two of the chosen weekdays are less than DCU's 48 hours apart. */
  | { kind: "close"; first: number; second: number }
  /** From a week on, the series holds more strength sessions a week than DCU recommends. */
  | { kind: "tooMany"; from: string; perWeek: number; max: number };

/**
 * What the guardrails would say about a strength series, before it is
 * made — shown, never enforced. Only full weeks inside the series count,
 * so its first and last weeks are not read as thin; too few a week is not
 * said, since a coach may make Tuesday's and Thursday's sessions as two
 * series of one each.
 */
export function strengthNotes(start: string, repeat: Repeat): StrengthNote[] {
  const notes: StrengthNote[] = [];
  const days = repeat.weekdays;
  const minDays = MIN_HOURS_BETWEEN_STRENGTH / 24;
  for (let i = 0; i < days.length && days.length > 1; i++) {
    const a = days[i]!;
    const b = days[(i + 1) % days.length]!;
    const gap = i + 1 < days.length ? b - a : b + 7 - a;
    if (gap < minDays) {
      notes.push({ kind: "close", first: a, second: b });
      break;
    }
  }
  const dates = repeatDates(start, repeat);
  for (let monday = mondayOf(start); monday <= repeat.until; monday = addDaysIso(monday, 7)) {
    const sunday = addDaysIso(monday, 6);
    if (monday < start || sunday > repeat.until) continue;
    const perWeek = dates.filter((d) => d >= monday && d <= sunday).length;
    const { perWeekMax } = strengthFrequency(monday);
    if (perWeek > perWeekMax) {
      notes.push({ kind: "tooMany", from: monday, perWeek, max: perWeekMax });
      break;
    }
  }
  return notes;
}
