/**
 * Names and text for files that leave Kadence. A file name is ASCII — a
 * phone, a trainer app or an old Windows tool can all save it — so Danish
 * letters are spelled out the Danish way (æ → ae, ø → oe, å → aa), other
 * accents dropped, and anything else becomes a hyphen. The old ERG and MRC
 * readers predate Unicode, so their header text is folded the same way.
 */

const SPELLED: Record<string, string> = {
  æ: "ae",
  Æ: "Ae",
  ø: "oe",
  Ø: "Oe",
  å: "aa",
  Å: "Aa",
  ß: "ss",
  "×": "x",
};

/** Printable ASCII only: Danish letters spelled out, accents dropped, the rest removed. */
export function asciiText(text: string): string {
  return text
    .replace(/[æÆøØåÅß×]/g, (c) => SPELLED[c] ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7e]/g, "")
    .trim();
}

/**
 * The day first, as a bike computer shows a workout: "29.09", and
 * "29.09-2" for the day's second session. A Garmin shows the first 15
 * characters of a workout's name, and two workouts that begin alike
 * overwrite each other, so the day and its number come before the title.
 */
export function dayLabel(onDate: string, index = 1): string {
  const [, month, day] = onDate.split("-");
  return `${day}.${month}${index > 1 ? `-${index}` : ""}`;
}

/** A file name that sorts by day and never meets another session's: "2026-09-29-tempo-3x8". */
export function datedFileBase(onDate: string, index: number, title: string): string {
  return `${onDate}${index > 1 ? `-${index}` : ""}-${slugify(title)}`;
}

/** A lower-case, hyphenated ASCII slug of at most 60 characters, `fallback` when nothing is left. */
export function slugify(name: string, fallback = "workout"): string {
  const slug = asciiText(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || fallback;
}
