/**
 * A calendar day in the reader's language: "man." / "Mon", "28. sep." /
 * "28 Sep", "mandag 28. september". Plan dates carry no clock, so they are
 * formatted in UTC and never move a day.
 */

function intlLocale(locale: string): string {
  return locale === "en" ? "en-GB" : "da-DK";
}

function at(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

export function weekdayShort(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", timeZone: "UTC" }).format(
    at(iso),
  );
}

export function dayMonth(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(at(iso));
}

/** "28. sep. 2026" / "28 Sep 2026": a day that may lie in another year. */
export function dayMonthYear(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(at(iso));
}

export function dayLong(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(at(iso));
}
