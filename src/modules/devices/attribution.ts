/**
 * Garmin's attribution, as its API Brand Guidelines (V 6.30.2025,
 * developer.garmin.com/brand-guidelines/api-brand-guidelines) ask of every
 * app that shows data fetched through the Connect Developer Program:
 *
 * - a ride from Garmin carries "Garmin [device model]" directly beneath or
 *   beside its title, wherever it is shown — the ride's page, a card, a
 *   list, a report — and plain "Garmin" when the device is not known;
 * - a chart, a total or an AI answer that the rides went into says that it
 *   is "derived in part from Garmin device-sourced data";
 * - never only in a tooltip, a footnote or a collapsed section.
 *
 * Only rides that came through Garmin's API carry it (`source = 'garmin'`).
 * A FIT file from a Garmin the rider uploaded by hand is the rider's own
 * file and says what file it came from, as before.
 *
 * Pure: no database, no words. The words are in messages under `garmin`.
 */

export type Sourced = { source: string; deviceName?: string | null };

const BRAND = "Garmin";

/** "Garmin Edge 1030 Plus", "Garmin" when the device is unknown, null for any other source. */
export function garminAttribution(ride: Sourced): string | null {
  if (ride.source !== "garmin") return null;
  const device = (ride.deviceName ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .replace(/^garmin\s+/i, "")
    .slice(0, 80);
  return device ? `${BRAND} ${device}` : BRAND;
}

/** The calendar's sessions with their rides, and the rides no session claims. */
export function anyFromGarminIn(
  sessions: { activity: Sourced | null }[],
  unplanned: Sourced[],
): boolean {
  return anyFromGarmin(unplanned) || sessions.some((s) => s.activity?.source === "garmin");
}

/** Whether any of these rides came from Garmin, so what is made of them says so. */
export function anyFromGarmin(rides: Iterable<Sourced>): boolean {
  for (const ride of rides) if (ride.source === "garmin") return true;
  return false;
}
