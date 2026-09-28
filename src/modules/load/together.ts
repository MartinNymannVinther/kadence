/**
 * Whether two rides were the same ride — a race, a group ride — so a
 * coach can lay the riders' curves over each other. Same day, both on
 * the bike, started within `MAX_START_GAP_MIN` of each other, about the
 * same distance (`MAX_DISTANCE_RATIO`), and, when both have GPS, started
 * within `MAX_START_APART_M` of the same place. Everything else on the
 * same day is two riders training on their own.
 *
 * Pure: imports nothing from the database.
 */

export const MAX_START_GAP_MIN = 45;
export const MAX_DISTANCE_RATIO = 1.2;
export const MAX_START_APART_M = 3000;

export type RideOutline = {
  id: string;
  riderId: string;
  onDate: string;
  sport: string;
  startedAt: Date;
  distanceM: number | null;
  /** The first fix of the ride, when it has one. */
  start: { lat: number; lon: number } | null;
};

const EARTH_M = 6_371_008.8;
const RAD = Math.PI / 180;

export function metresApart(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function firstFix(streams: unknown): { lat: number; lon: number } | null {
  const s = streams as { lat?: (number | null)[]; lon?: (number | null)[] } | null;
  if (!s?.lat || !s.lon) return null;
  for (let i = 0; i < s.lat.length; i++) {
    const lat = s.lat[i];
    const lon = s.lon[i];
    if (typeof lat === "number" && typeof lon === "number") return { lat, lon };
  }
  return null;
}

export function riddenTogether(a: RideOutline, b: RideOutline): boolean {
  if (a.id === b.id || a.riderId === b.riderId) return false;
  if (a.sport !== "bike" || b.sport !== "bike" || a.onDate !== b.onDate) return false;
  const gapMin = Math.abs(a.startedAt.getTime() - b.startedAt.getTime()) / 60_000;
  if (gapMin > MAX_START_GAP_MIN) return false;
  if (a.distanceM !== null && b.distanceM !== null) {
    const [short, long] =
      a.distanceM < b.distanceM ? [a.distanceM, b.distanceM] : [b.distanceM, a.distanceM];
    if (short <= 0 || long / short > MAX_DISTANCE_RATIO) return false;
  }
  if (a.start && b.start && metresApart(a.start, b.start) > MAX_START_APART_M) return false;
  return true;
}

/** The rides among `candidates` that were the same ride as `ride`. */
export function companionsOf<T extends RideOutline>(
  ride: RideOutline,
  candidates: readonly T[],
): T[] {
  return candidates.filter((c) => riddenTogether(ride, c));
}
