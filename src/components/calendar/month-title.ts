/** "Oktober 2026" / "October 2026": a month as a heading says it. */
export function monthTitle(month: string, locale: string): string {
  const text = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}
