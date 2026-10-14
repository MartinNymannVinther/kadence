import { loadFromRpe } from "@/modules/training/load-bridge";
import type { ActivityValues } from "./from-fit";

/**
 * What a stored ride becomes when its file is read again with the moving
 * time corrected (docs/adr/0096). Pure: the service (retime.ts) reads the
 * row and the file, this decides what changes.
 *
 * Until the fix in src/modules/fit/timeline.ts, a device on smart
 * recording lost every silence over five seconds as a pause, so its ride
 * was stored with too few moving seconds, and the averages, zones, work
 * and load computed from them were off too. A ride whose moving time read
 * again differs from the stored one by more than 30 seconds and more than
 * 1 % is corrected; anything less is left as it is, so a ride is not
 * rewritten for a second's rounding, nor its load recomputed for nothing.
 *
 * The load follows the rule the import and the rider's feedback follow
 * (ADR 0016, src/modules/training/complete.ts): a ride given its load by
 * power or heart rate takes the load read again, at the rider's current
 * thresholds; a ride whose load came from the rider's RPE keeps that
 * method, recomputed from the new minutes; and a ride that has an RPE
 * where the file gives nothing better falls back to it, as the feedback
 * does. Title, RPE, feel, note, the matched session, the start and the
 * elapsed time are never touched.
 */

/** A difference this small is not a correction. Both must be passed. */
export const RETIME_MIN_SECONDS = 30;
export const RETIME_MIN_SHARE = 0.01;

export type StoredRide = {
  movingSeconds: number;
  sport: string;
  rpe: number | null;
  loadMethod: string;
};

export type RetimePatch = Pick<
  ActivityValues,
  | "movingSeconds"
  | "avgPower"
  | "weightedPower"
  | "avgHr"
  | "avgCadence"
  | "workKj"
  | "zoneSeconds"
  | "maxSpeed"
  | "streams"
  | "bestPowers"
  | "hrDrift"
  | "load"
  | "loadMethod"
>;

/** Whether the moving time read again is far enough from the stored one to correct. */
export function movingTimeOff(stored: number, fresh: number): boolean {
  const difference = Math.abs(fresh - stored);
  return difference > RETIME_MIN_SECONDS && difference > stored * RETIME_MIN_SHARE;
}

const sportOf = (sport: string) =>
  sport === "strength" || sport === "other" ? sport : ("bike" as const);

/** The columns to write, or null when the stored ride is right as it is. */
export function retimePatch(stored: StoredRide, values: ActivityValues): RetimePatch | null {
  if (!movingTimeOff(stored.movingSeconds, values.movingSeconds)) return null;
  const fromRpe = () =>
    loadFromRpe(Math.round(values.movingSeconds / 60), stored.rpe, sportOf(stored.sport));
  const { load, method } =
    stored.loadMethod === "rpe" || (values.loadMethod === "none" && stored.rpe !== null)
      ? fromRpe()
      : { load: values.load, method: values.loadMethod };
  return {
    movingSeconds: values.movingSeconds,
    avgPower: values.avgPower,
    weightedPower: values.weightedPower,
    avgHr: values.avgHr,
    avgCadence: values.avgCadence,
    workKj: values.workKj,
    zoneSeconds: values.zoneSeconds,
    maxSpeed: values.maxSpeed,
    streams: values.streams,
    bestPowers: values.bestPowers,
    hrDrift: values.hrDrift,
    load,
    loadMethod: method,
  };
}
