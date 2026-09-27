/**
 * Minutes as a person says them: "45 min", "2 t", "1 t 30 min". The words
 * come from the `training.duration` messages, so English reads "1 h 30 min".
 */
type Translate = (
  key: "minutes" | "hours" | "hoursMinutes",
  values: Record<string, number>,
) => string;

export function durationText(minutes: number, t: Translate): string {
  const whole = Math.max(0, Math.round(minutes));
  const h = Math.floor(whole / 60);
  const m = whole % 60;
  if (h === 0) return t("minutes", { m });
  return m === 0 ? t("hours", { h }) : t("hoursMinutes", { h, m });
}

/** Hours with one decimal, for totals: "7,5" in Danish, "7.5" in English. */
export function hoursText(minutes: number, locale: string): string {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "da-DK", {
    maximumFractionDigits: 1,
  }).format(Math.round(minutes / 6) / 10);
}

/** A step's length as the builder writes it: "5:00", "1:30:00". */
export function clockText(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
