/**
 * Numbers and dates as a chart's reader says them: "11,2" in Danish,
 * "11.2" in English; "22. sep." and "22 Sept". Pure.
 */

const tag = (locale: string) => (locale === "en" ? "en-GB" : "da-DK");

export function num(value: number, locale: string, digits = 0): string {
  return new Intl.NumberFormat(tag(locale), {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}

/** A signed number, with a real minus sign: "+3", "−2,5". */
export function signed(value: number, locale: string, digits = 0): string {
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return num(0, locale, digits);
  return `${rounded > 0 ? "+" : "−"}${num(Math.abs(rounded), locale, digits)}`;
}

const utc = (iso: string) => new Date(`${iso}T12:00:00Z`);

export function dayMonthShort(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(tag(locale), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(utc(iso));
}

export function monthShort(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(tag(locale), { month: "short", timeZone: "UTC" }).format(utc(iso));
}

export function monthLong(month: number, locale: string): string {
  const iso = `2026-${String(month).padStart(2, "0")}-01`;
  return new Intl.DateTimeFormat(tag(locale), { month: "long", timeZone: "UTC" }).format(utc(iso));
}
