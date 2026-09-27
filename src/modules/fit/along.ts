import type { Timeline } from "./timeline";

/**
 * Metres ridden by the end of every second of the timeline: the device's
 * own distance where it wrote one (counted from its first value, never
 * going backwards), else the speed summed second by second. A pause adds
 * nothing. Laps and climbs measure their length on this line.
 */
export function metresAlong(line: Pick<Timeline, "distance" | "speed">): number[] {
  const out = new Array<number>(Math.max(line.distance.length, line.speed.length)).fill(0);
  const fromDevice = line.distance.some((d) => d !== null);
  let base: number | undefined;
  let metres = 0;
  for (let s = 0; s < out.length; s++) {
    if (fromDevice) {
      const d = line.distance[s] ?? null;
      if (d !== null) {
        base ??= d;
        metres = Math.max(metres, d - base);
      }
    } else {
      metres += line.speed[s] ?? 0;
    }
    out[s] = metres;
  }
  return out;
}

/** Metres ridden in the seconds `[start, end)`. */
export function metresBetween(along: readonly number[], start: number, end: number): number {
  if (end <= start) return 0;
  const before = start > 0 ? (along[start - 1] ?? 0) : 0;
  return (along[end - 1] ?? before) - before;
}
