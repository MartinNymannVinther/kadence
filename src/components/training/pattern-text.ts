import type { ChangePattern } from "@/modules/training/change-patterns";

/** The words a pattern is told in; `t` is `changes.patterns`, `reason` is `changes.reason`. */
type T = (key: string, values?: Record<string, string | number>) => string;

/** Monday 23 November 2026 plus the weekday, named in the reader's language. */
export function weekdayName(weekday: number, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, 10, 23 + weekday)));
}

/**
 * One sentence for a pattern in a rider's changes (docs/adr/0119), said
 * as a colleague would: what Kadence sees, and a possibility beside it.
 */
export function patternText(pattern: ChangePattern, t: T, reason: T, locale: string): string {
  const values = { count: pattern.count, total: pattern.total };
  switch (pattern.key) {
    case "weekday":
      return t(pattern.reason ? "weekdayWhy" : "weekday", {
        ...values,
        day: weekdayName(pattern.weekday, locale),
        reason: pattern.reason ? reason(pattern.reason) : "",
      });
    case "reason":
      return t("reason", { ...values, reason: reason(pattern.reason) });
    case "long":
      return t("long", values);
    case "strength":
      return t("strength", values);
  }
}
