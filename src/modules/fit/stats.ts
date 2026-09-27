/** Small arithmetic over a channel, shared by the ride's summary, its laps and its climbs. */

export type Channel = (number | null)[];

export interface ChannelStats {
  avg?: number;
  max?: number;
  sum: number;
  count: number;
}

/** Sum, count, average and maximum of the values that are not null. */
export function stats(values: readonly (number | null)[]): ChannelStats {
  let sum = 0;
  let count = 0;
  let max: number | undefined;
  for (const value of values) {
    if (value === null) continue;
    sum += value;
    count++;
    if (max === undefined || value > max) max = value;
  }
  return { avg: count > 0 ? sum / count : undefined, max, sum, count };
}

export function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function rounded(value: number | undefined, digits: number): number | undefined {
  return value === undefined ? undefined : round(value, digits);
}

/** Cadence without the zeros: how fast the rider pedals when pedalling. */
export const pedalling = (values: readonly (number | null)[]) =>
  values.map((c) => (c === 0 ? null : c));
