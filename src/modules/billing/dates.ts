import { addDaysIso, diffDays, todayInCopenhagen } from "@/core/dates";

/**
 * The days a plan is about, as Copenhagen days (docs/adr/0090). Every end
 * the database holds — trial_ends_at, paid_until, free_until — is a
 * moment; the page and the mail name the last day it covers, the
 * Copenhagen day of the moment just before it, so a payment through 30
 * September, which ends at the midnight after, reads "30. september".
 * Pure.
 */

/** The last Copenhagen day a plan's end covers. */
export function lastDay(end: Date): string {
  return todayInCopenhagen(new Date(end.getTime() - 1));
}

/** Days from today to that last day: 0 on the last day itself, negative after. */
export function daysLeft(end: Date, now: Date = new Date()): number {
  return diffDays(todayInCopenhagen(now), lastDay(end));
}

/** The banner for a trial waits until the last week. */
export const TRIAL_BANNER_DAYS = 7;

/** A day written out: "30. september 2027" in Danish, "30 September 2027" in English. */
export function formatLongDay(dayIso: string, locale: string): string {
  const [y, m, d] = dayIso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)));
}

/** Whole kroner with the reader's separator: "1.200" in Danish, "1,200" in English. */
export function formatKroner(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "da-DK", {
    maximumFractionDigits: 0,
  }).format(amount);
}

/** A year's period from `from`: through the day before the same date next year. */
export function yearFrom(from: string): string {
  const next = `${Number(from.slice(0, 4)) + 1}${from.slice(4)}`;
  return addDaysIso(next, -1);
}
