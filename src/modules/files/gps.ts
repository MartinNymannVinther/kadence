import type { FitRecord } from "@/modules/fit";

/**
 * Distance and speed from positions, for files that carry only where the
 * rider was (most GPX, some TCX): the distance summed along the track with
 * the haversine formula, and the speed over a window of a few points so
 * one jumpy fix does not make a spike. A file that has its own distance or
 * speed keeps it. Without speed, Kadence's timeline could not tell a stop
 * from riding, so this is what makes moving time right for such files.
 */

const EARTH_M = 6_371_008.8;
const RAD = Math.PI / 180;
/** Points on each side of the one a speed is taken for. */
const SPEED_WINDOW = 2;
/** A longer gap than this between the window's ends is a pause, not a speed. */
const MAX_SPEED_GAP_S = 20;

export function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function completeFromGps(records: FitRecord[]): void {
  const hasDistance = records.some((r) => r.distance !== undefined);
  const hasSpeed = records.some((r) => r.speed !== undefined);
  if (hasDistance && hasSpeed) return;

  const along: (number | undefined)[] = [];
  let metres = 0;
  let last: { lat: number; lon: number } | undefined;
  for (const r of records) {
    if (r.lat !== undefined && r.lon !== undefined) {
      const here = { lat: r.lat, lon: r.lon };
      if (last) metres += haversine(last, here);
      last = here;
      along.push(metres);
    } else along.push(last ? metres : undefined);
  }
  if (!last) return;

  records.forEach((r, i) => {
    if (!hasDistance && along[i] !== undefined) r.distance = along[i];
    if (hasSpeed) return;
    const a = Math.max(0, i - SPEED_WINDOW);
    const b = Math.min(records.length - 1, i + SPEED_WINDOW);
    const seconds = (records[b]!.t - records[a]!.t) / 1000;
    const from = along[a];
    const to = along[b];
    if (from !== undefined && to !== undefined && seconds > 0 && seconds <= MAX_SPEED_GAP_S)
      r.speed = (to - from) / seconds;
  });
}
