/**
 * The name an activity from Wahoo, Garmin or Polar is stored under. The import
 * takes an activity's title from its file name, so a provider's workout
 * name — text a person typed on a phone, untrusted like the rest of the
 * payload — becomes printable, one line, without path separators, at most
 * 100 characters, and ends in .fit.
 */
export function activityFileName(name: string | null | undefined, fallback: string): string {
  const clean = (name ?? "")
    .replace(/[\p{Cc}\p{Cf}/\\]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return `${clean || fallback}.fit`;
}
