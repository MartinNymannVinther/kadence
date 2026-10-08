/**
 * Team names as the sources write them differ in case, spacing and
 * punctuation ("Team coloQuick", "TEAM COLOQUICK", "Airtox  Carl Ras",
 * "AIRTOX - CARL RAS"). Matching is done on a key with none of that:
 * lower case, letters and digits only, diacritics folded. Not a
 * fingerprint of the team, only a way to tell that two lists mean the
 * same one.
 *
 * Pure.
 */
export function nameKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ø/gi, "o")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** A name for the page from a list that shouts: "TEAM COLOQUICK" → "Team Coloquick". */
export function tidyCase(name: string): string {
  const trimmed = name.replace(/\s+/g, " ").trim();
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed
    .toLowerCase()
    .replace(
      /(^|[\s\-/.(])(\p{L})/gu,
      (_, before: string, letter: string) => before + letter.toUpperCase(),
    );
}
