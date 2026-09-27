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
