import type { Streams } from "./streams-chart";

/**
 * Rides laid over each other line up by distance — everyone rode the same
 * road, at their own pace — from each ride's speed summed over its
 * samples; a ride without speed lines up by time instead, and then so
 * does everyone. Each ride is thinned to at most `MAX_POINTS`. Pure, so
 * it is tested alone.
 */

export const MAX_POINTS = 600;

export type AlignedRide = {
  /** Metres (or seconds) from the start, one per kept sample. */
  x: number[];
  power: (number | null)[];
  hr: (number | null)[];
  speed: (number | null)[];
  alt: (number | null)[];
};

export type Axis = "distance" | "time";

export function distanceAlong(streams: Streams): number[] | null {
  const speed = streams.speed;
  if (!speed || !speed.some((v) => typeof v === "number")) return null;
  const step = streams.t.length > 1 ? streams.t[1]! - streams.t[0]! : 5;
  let m = 0;
  return streams.t.map((_, i) => {
    m += (speed[i] ?? 0) * step;
    return m;
  });
}

export function alignRides(rides: readonly Streams[]): { axis: Axis; rides: AlignedRide[] } {
  const distances = rides.map(distanceAlong);
  const axis: Axis = distances.every((d) => d !== null) ? "distance" : "time";
  return {
    axis,
    rides: rides.map((streams, r) => {
      const x = axis === "distance" ? distances[r]! : streams.t;
      const step = Math.max(1, Math.ceil(x.length / MAX_POINTS));
      const keep = x.map((_, i) => i).filter((i) => i % step === 0);
      const pick = (channel: (number | null)[] | undefined) =>
        keep.map((i) => (typeof channel?.[i] === "number" ? (channel[i] as number) : null));
      return {
        x: keep.map((i) => x[i]!),
        power: pick(streams.power),
        hr: pick(streams.hr),
        speed: pick(streams.speed).map((v) => (v === null ? null : v * 3.6)),
        alt: pick(streams.alt),
      };
    }),
  };
}

/** The index of the sample nearest `value` on a rising axis. */
export function nearestIndex(x: readonly number[], value: number): number {
  let lo = 0;
  let hi = x.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (x[mid]! < value) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(x[lo - 1]! - value) <= Math.abs(x[lo]! - value)) return lo - 1;
  return lo;
}
