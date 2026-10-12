/**
 * What a ride's heart rate says about the rider's thresholds, read from
 * the 5-second stream every ride keeps (`streams.hr`, `STREAM_SECONDS`):
 * the highest average over any 20 minutes, and the highest pulse held
 * for two samples in a row. Used by the threshold proposal
 * (threshold-estimate.ts, docs/adr/0094).
 *
 * A chest strap or a watch can lie: a dry strap at the start, a spark of
 * static, an optical sensor that locks onto the cadence. So before
 * anything is read, a sample is dropped when it is
 *
 * - outside 30 bpm and the ceiling (`heartRateCeiling`), or
 * - more than `MAX_JUMP_BPM` from the last kept sample just before it — a
 *   heart does not move 30 beats in five seconds. After
 *   `RESET_AFTER_SAMPLES` dropped in a row the new level is believed:
 *   then it was the old one that was wrong, or the strap came back.
 *
 * A max is a value held for two samples in a row (about ten seconds),
 * never a single sample. These numbers are Kadence's judgement, not a
 * published method (docs/research/taerskler-fra-turene.md).
 *
 * Pure: imports nothing from the database.
 */

export const HR_STREAM_SECONDS = 5;
export const HR_FLOOR = 30;
export const HR_ABSOLUTE_CEILING = 230;
export const MAX_JUMP_BPM = 30;
export const RESET_AFTER_SAMPLES = 6;
/** Twenty minutes of 5-second samples. */
export const TWENTY_MINUTES_SAMPLES = (20 * 60) / HR_STREAM_SECONDS;
/** A 20-minute window counts when nine in ten of its samples have a pulse. */
export const MIN_COVERAGE = 0.9;

export type RideHeartRate = {
  /** The highest average over any 20 minutes, unrounded; null when no window has enough pulse. */
  best20Min: number | null;
  /** The highest pulse held for two samples in a row; null when there is none. */
  heldMax: number | null;
};

/** Tanaka, Monahan & Seals (2001): 208 − 0.7 × age. Only ever a bound, never a value. */
export function tanakaMaxHr(age: number): number {
  return 208 - 0.7 * age;
}

/** The age a rider turns in the year of `today` — DCU's classes go by the year. */
export function ageIn(birthYear: number, today: string): number {
  return Number(today.slice(0, 4)) - birthYear;
}

/** The highest pulse believed for a rider of this age: the age line plus a wide margin. */
export function heartRateCeiling(age: number): number {
  return Math.min(HR_ABSOLUTE_CEILING, Math.round(tanakaMaxHr(age) + 30));
}

function reading(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** The stream with the samples nobody's heart produced set to null. */
export function cleanHeartRate(
  hr: readonly unknown[],
  ceiling: number = HR_ABSOLUTE_CEILING,
): (number | null)[] {
  const out: (number | null)[] = [];
  let last: number | null = null;
  let dropped = 0;
  for (const raw of hr) {
    const v = reading(raw);
    if (v === null || v < HR_FLOOR || v > ceiling) {
      out.push(null);
      // A gap ends the comparison: after a lost signal any level may be true.
      last = null;
      dropped = 0;
      continue;
    }
    if (last !== null && Math.abs(v - last) > MAX_JUMP_BPM && dropped < RESET_AFTER_SAMPLES) {
      out.push(null);
      dropped++;
      continue;
    }
    out.push(v);
    last = v;
    dropped = 0;
  }
  return out;
}

/** The highest average over any `window` samples with enough of them read. */
export function bestWindowAverage(
  values: readonly (number | null)[],
  window: number = TWENTY_MINUTES_SAMPLES,
): number | null {
  if (values.length < window) return null;
  const need = Math.ceil(window * MIN_COVERAGE);
  let sum = 0;
  let count = 0;
  let best: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v !== null && v !== undefined) {
      sum += v;
      count++;
    }
    const out = i - window;
    if (out >= 0) {
      const o = values[out];
      if (o !== null && o !== undefined) {
        sum -= o;
        count--;
      }
    }
    if (i >= window - 1 && count >= need) {
      const avg = sum / count;
      if (best === null || avg > best) best = avg;
    }
  }
  return best;
}

/** The highest value held for two samples in a row. */
export function heldMax(values: readonly (number | null)[]): number | null {
  let best: number | null = null;
  for (let i = 1; i < values.length; i++) {
    const a = values[i - 1];
    const b = values[i];
    if (a === null || a === undefined || b === null || b === undefined) continue;
    const held = Math.min(a, b);
    if (best === null || held > best) best = held;
  }
  return best;
}

/** One ride's heart rate, from its 5-second stream; null when the stream has no pulse. */
export function summarizeHeartRate(
  hr: readonly unknown[] | null | undefined,
  ceiling: number = HR_ABSOLUTE_CEILING,
): RideHeartRate | null {
  if (!Array.isArray(hr) || hr.length === 0) return null;
  const clean = cleanHeartRate(hr, ceiling);
  if (!clean.some((v) => v !== null)) return null;
  return { best20Min: bestWindowAverage(clean), heldMax: heldMax(clean) };
}
