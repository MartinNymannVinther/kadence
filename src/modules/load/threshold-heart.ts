import { tanakaMaxHr } from "./heart-rate-summary";
import {
  firstWindow,
  forWindow,
  inWindow,
  MIN_RIDES,
  missing,
  source,
  type Confidence,
  type Context,
  type Estimate,
  type EstimateRide,
  type Note,
  type WindowDays,
} from "./threshold-shared";

/**
 * The pulse numbers proposed from the rides (docs/adr/0094):
 *
 * - **Threshold pulse**: `LTHR_OF_BEST_20` of the highest 20-minute
 *   average in a hard ride. Friel's 30-minute test takes the last 20
 *   minutes of an all-out half hour; a ride's best 20 minutes in a race
 *   also carries surges and drift, so Kadence takes a little off.
 * - **Max pulse**: the highest pulse held for two samples, over the year
 *   (a max needs an all-out moment, and those are rare; it does not rise
 *   with form). Only when it is above what is saved, and not far under
 *   what is usual for the age (Tanaka et al. 2001, a bound, never the value).
 * - **Resting pulse**: never from a ride. The median of the resting
 *   pulses measured by hand (`rider_measurements`), when there are any.
 *
 * A 20 minutes counts as hard at `HARD_SHARE` of the reference max: the
 * highest of the rides' own max, the saved max and the age line less
 * `AGE_MARGIN`. All of these numbers are Kadence's judgement
 * (docs/research/taerskler-fra-turene.md).
 *
 * Pure: imports nothing from the database.
 */

export const LTHR_OF_BEST_20 = 0.97;
export const HARD_SHARE = 0.87;
export const AGE_MARGIN = 10;
/** A max further than this under the age line says no ride was all-out. */
export const ALL_OUT_MARGIN = 20;
/** Two rides within this many beats of the max make it a sure one. */
export const SAME_MAX_BPM = 3;
/** Two hard rides within this share of the best make a threshold pulse a sure one. */
export const SAME_LTHR_SHARE = 0.03;

/** The pulse a hard 20 minutes is measured against. */
export function referenceMax(rides: readonly EstimateRide[], ctx: Context): number {
  const seen = rides.map((r) => r.heartRate?.heldMax ?? 0);
  return Math.max(...seen, ctx.current.maxHr ?? 0, tanakaMaxHr(ctx.age) - AGE_MARGIN);
}

/** Whether a ride's best 20 minutes were hard by its pulse; null when the pulse was not read or not there. */
export function hardByPulse(ride: EstimateRide, refMax: number): boolean | null {
  const best = ride.heartRate?.best20Min;
  if (best === null || best === undefined) return null;
  return best >= HARD_SHARE * refMax;
}

function thresholdIn(
  rides: readonly EstimateRide[],
  days: WindowDays,
  ctx: Context,
  refMax: number,
): Estimate {
  const withHr = inWindow(rides, days, ctx.today).filter((r) => r.hasHeartRate);
  if (withHr.length === 0) return missing("noHeartRate", days);
  if (withHr.length < MIN_RIDES) return missing("fewHeartRateRides", days);
  const hard = withHr
    .filter((r) => hardByPulse(r, refMax) === true)
    .sort((a, b) => b.heartRate!.best20Min! - a.heartRate!.best20Min!);
  const best = hard[0];
  if (!best) return missing("noHardHeartRate", days);
  const top = best.heartRate!.best20Min!;
  const close = hard.filter((r) => r.heartRate!.best20Min! >= top * (1 - SAME_LTHR_SHARE));
  const notes: Note[] = [];
  const confidence = forWindow(close.length >= 2 ? "high" : "medium", notes, days, ctx.youth);
  return {
    value: Math.round(top * LTHR_OF_BEST_20),
    method: "best20HeartRate",
    windowDays: days,
    confidence,
    sources: [source(best)],
    missing: null,
    notes,
  };
}

export function estimateThresholdHr(rides: readonly EstimateRide[], ctx: Context): Estimate {
  const refMax = referenceMax(inWindow(rides, 365, ctx.today), ctx);
  return firstWindow((days) => thresholdIn(rides, days, ctx, refMax));
}

export function estimateMaxHr(rides: readonly EstimateRide[], ctx: Context): Estimate {
  const year = inWindow(rides, 365, ctx.today);
  if (!year.some((r) => r.hasHeartRate)) return missing("noHeartRate", 365);
  const read = year.filter((r) => typeof r.heartRate?.heldMax === "number");
  const best = read.sort((a, b) => b.heartRate!.heldMax! - a.heartRate!.heldMax!)[0];
  if (!best) return missing("noHeartRate", 365);
  const max = Math.round(best.heartRate!.heldMax!);
  if (max < tanakaMaxHr(ctx.age) - ALL_OUT_MARGIN) return missing("noAllOut", 365);
  if (ctx.current.maxHr !== null && max <= ctx.current.maxHr)
    return missing("notAboveCurrent", 365);
  const close = read.filter((r) => r.heartRate!.heldMax! >= max - SAME_MAX_BPM);
  const confidence: Confidence = close.length >= 2 ? "high" : "medium";
  return {
    value: max,
    method: "heldMaxHeartRate",
    windowDays: 365,
    confidence,
    sources: [source(best)],
    missing: null,
    notes: [],
  };
}

export type RestingMeasurement = { measuredOn: string; value: number };

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function estimateRestingHr(measured: readonly RestingMeasurement[], ctx: Context): Estimate {
  const dated = measured.map((m) => ({ ...m, onDate: m.measuredOn }));
  return firstWindow((days) => {
    const inDays = inWindow(dated, days, ctx.today);
    if (inDays.length === 0) return missing("noMeasurement", days);
    const confidence: Confidence =
      inDays.length >= 3 ? "high" : inDays.length === 2 ? "medium" : "low";
    return {
      value: Math.round(median(inDays.map((m) => m.value))),
      method: "measuredRestingHr",
      windowDays: days,
      confidence,
      sources: inDays
        .sort((a, b) => b.onDate.localeCompare(a.onDate))
        .slice(0, 3)
        .map((m) => ({ activityId: null, onDate: m.onDate, title: "" })),
      missing: null,
      notes: [],
    };
  });
}
