/**
 * Whether a ride's stored title is a file's name rather than a name
 * (docs/adr/0098). The import keeps a file's own name when the file has
 * no other (src/modules/devices/import.ts), so a ride from Garmin's export
 * is called "23456789012_ACTIVITY" and one from an Edge
 * "2026-09-20-11-16-25". Those say nothing to a rider, and the pages name
 * the ride instead (ride-name.ts).
 *
 * Conservative on purpose: only shapes a person would never type are
 * file names. Everything else — "Morning Ride", "Zwift - Watopia",
 * "Eftermiddagstur", a device's "Indendørs cykling" — is a name and kept.
 */

/** Kadence's own stand-ins when a provider sends no name (src/modules/devices/{wahoo,garmin,polar}.ts). */
const PLACEHOLDERS = new Set(["wahoo", "garmin", "polar"]);

/** A file's ending, should one have stayed on the title. */
const EXTENSION = /\.(fit|tcx|gpx|json|csv)(\.(gz|zip))?$|\.(gz|zip)$/i;

/** A browser's second download of the same file: "23456789012 (1)". */
const COPY_SUFFIX = /\s*\(\d{1,3}\)$/;

const SHAPES: readonly RegExp[] = [
  // An id: Strava, Garmin Connect, Wahoo's cloud ("23456789012").
  /^\d{6,}$/,
  // Garmin Connect's download ("23456700001_ACTIVITY", "activity_23456700001").
  /^\d{6,}[_ -]activity$/i,
  /^activity[_ -]\d{6,}$/i,
  // Garmin's full export ("name@example.com_23456700001").
  /^[^\s@]+@[^\s@]+_\d{6,}$/,
  // A date, alone or with the time of day, in the ways devices and apps
  // write it: Garmin Edge and Zwift ("2026-09-20-11-16-25"), phones
  // ("2026-09-20 11.16.25", "20260920_111625"), ISO ("2026-09-20T11:16:25Z").
  /^\d{4}([-_.]?)\d{2}\1\d{2}([ T_-]\d{2}([-.:_h]?)\d{2}(\3\d{2})?(Z|[+-]\d{2}:?\d{2})?)?$/i,
  // Wahoo ELEMNT's own files ("2026-09-20-111625-ELEMNT BOLT A1B2-12-0").
  /^\d{4}-\d{2}-\d{2}-\d{6}-elemnt\b/i,
  // Polar Flow's and others' exports: anything ending in a full time stamp
  // ("Ida_Berg_2026-09-20_11-16-25").
  /[_ -]\d{4}-\d{2}-\d{2}[_ T-]\d{2}[-.:]\d{2}[-.:]\d{2}$/,
  // Older Garmin devices' eight characters: year, month, day and hour in
  // base 36, then minutes and seconds ("B9K91234").
  /^[0-9A-Z][1-9A-C][1-9A-V][0-9A-N][0-5]\d[0-5]\d$/,
  // A UUID, or a long hexadecimal digest.
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  /^(?=[a-f]*\d)[0-9a-f]{16,}$/i,
];

export function looksLikeFileName(title: string | null | undefined): boolean {
  const trimmed = (title ?? "").trim();
  if (trimmed === "") return true;
  if (PLACEHOLDERS.has(trimmed.toLowerCase())) return true;
  if (EXTENSION.test(trimmed)) return true;
  const bare = trimmed.replace(COPY_SUFFIX, "");
  return SHAPES.some((shape) => shape.test(bare));
}
