import { round, rounded, stats } from "./stats";
import type { Timeline } from "./timeline";

/**
 * The climbs of a ride, found in its altitude: where the road went up for
 * long enough, and steeply enough, to be a hill a rider would name.
 *
 * Altitude is read against distance, not time, so a slow climb and a fast
 * one look the same: the trace is averaged into bins of `BIN_M` metres and
 * smoothed over `SMOOTH_BINS` of them, which takes out a barometer's
 * wander and a GPS altitude's jumps. Then, from the lowest point, the
 * highest point after it is followed until the road has fallen
 * `dropFor(gain)` below it — a short dip on the way up belongs to the
 * climb, a real descent ends it. The climb is trimmed to where it really
 * starts and ends (within `TRIM_M` of its foot and its top) and kept when
 * it gained at least `MIN_GAIN_M` over `MIN_LENGTH_M` at an average of
 * `MIN_GRADE_PCT` or more. Danish hills are short: the limits are set so
 * Munkebjerg counts and a bridge does not.
 *
 * A ride without altitude or without distance (a trainer indoors) has no
 * climbs. At most `MAX_CLIMBS` are kept.
 */

export const BIN_M = 25;
export const SMOOTH_BINS = 5;
export const MIN_GAIN_M = 15;
export const MIN_LENGTH_M = 300;
export const MIN_GRADE_PCT = 3;
export const TRIM_M = 2;
export const MAX_CLIMBS = 30;

const dropFor = (gain: number) => Math.max(8, gain * 0.2);

export interface ClimbSummary {
  /** Seconds since the ride's start, foot and top. */
  startS: number;
  endS: number;
  /** Metres into the ride where the climb starts. */
  atM: number;
  distanceM: number;
  gainM: number;
  /** Average gradient in per cent. */
  gradePct: number;
  avgPower?: number;
  avgHr?: number;
}

type Point = { m: number; alt: number; first: number; last: number };

function profile(line: Timeline, along: readonly number[]): Point[] {
  const bins = new Map<number, { sum: number; count: number; first: number; last: number }>();
  for (let s = 0; s < line.alt.length; s++) {
    const alt = line.alt[s];
    if (alt === null || alt === undefined) continue;
    const key = Math.floor((along[s] ?? 0) / BIN_M);
    const bin = bins.get(key);
    if (bin) {
      bin.sum += alt;
      bin.count++;
      bin.last = s;
    } else bins.set(key, { sum: alt, count: 1, first: s, last: s });
  }
  const raw = [...bins.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, b]) => ({ m: key * BIN_M, alt: b.sum / b.count, first: b.first, last: b.last }));
  const half = Math.floor(SMOOTH_BINS / 2);
  return raw.map((point, i) => {
    const window = raw.slice(Math.max(0, i - half), i + half + 1);
    return { ...point, alt: window.reduce((sum, p) => sum + p.alt, 0) / window.length };
  });
}

export function findClimbs(line: Timeline, along: readonly number[]): ClimbSummary[] {
  const points = profile(line, along);
  if (points.length < 2 || (along.at(-1) ?? 0) < MIN_LENGTH_M) return [];
  const hasPower = line.power.some((p) => p !== null);
  const climbs: ClimbSummary[] = [];

  const close = (low: number, high: number) => {
    const foot = points[low]!.alt;
    const top = points[high]!.alt;
    let start = low;
    for (let i = low; i <= high; i++) if (points[i]!.alt <= foot + TRIM_M) start = i;
    let end = high;
    for (let i = high; i >= start; i--) if (points[i]!.alt >= top - TRIM_M) end = i;
    const a = points[start]!;
    const b = points[end]!;
    const distance = b.m - a.m;
    const gain = b.alt - a.alt;
    if (gain < MIN_GAIN_M || distance < MIN_LENGTH_M) return;
    const grade = (gain / distance) * 100;
    if (grade < MIN_GRADE_PCT) return;
    const seconds = { from: a.first, to: b.last + 1 };
    const power = stats(line.power.slice(seconds.from, seconds.to));
    const hr = stats(line.hr.slice(seconds.from, seconds.to));
    climbs.push({
      startS: seconds.from,
      endS: seconds.to,
      atM: Math.round(a.m),
      distanceM: Math.round(distance),
      gainM: Math.round(gain),
      gradePct: round(grade, 1),
      avgPower: hasPower ? rounded(power.avg, 0) : undefined,
      avgHr: rounded(hr.avg, 0),
    });
  };

  let low = 0;
  let high = 0;
  for (let i = 1; i < points.length; i++) {
    const alt = points[i]!.alt;
    if (alt > points[high]!.alt) high = i;
    const gain = points[high]!.alt - points[low]!.alt;
    if (high > low && alt <= points[high]!.alt - dropFor(gain)) {
      close(low, high);
      low = i;
      high = i;
    } else if (alt < points[low]!.alt) {
      low = i;
      high = i;
    }
  }
  if (high > low) close(low, high);
  return climbs.slice(0, MAX_CLIMBS);
}
