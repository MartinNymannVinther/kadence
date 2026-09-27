import { loadAt, rpeLoad, sessionRpe } from "./calibration";
import type { Thresholds } from "./zones";
import { weightedPower } from "./weighted-power";

/**
 * The load of one activity that was done, by the best method its data
 * allows (ADR 0016), tried in this order:
 *
 * 1. **power** — a bike ride with the rider's FTP and either a 1 Hz power
 *    stream or a weighted power from the device: hours × (weighted ÷ FTP)²
 *    × 100. The most direct measure there is.
 * 2. **hr** — a ride (or another sport) with the rider's threshold heart
 *    rate and an average heart rate: hours × (average ÷ threshold)² × 100.
 *    An approximation: heart rate lags and drifts, and an average hides
 *    the surges that power sees, so a hard interval session reads lower
 *    and an easy ride higher than by power. Two guards keep it sensible:
 *    an average under 40 % of threshold is a strap that lost contact, not
 *    a ride, and the method is skipped; and the ratio is capped at 1.05,
 *    because a whole session cannot average far above threshold — a
 *    higher reading means the threshold is out of date.
 * 3. **rpe** — minutes × how hard it felt, calibrated onto the same scale
 *    (`calibration.ts`). Works for everything; strength sessions use only
 *    this, since neither watts nor pulse describe a squat.
 * 4. **none** — nothing to go on; the load is 0 and the UI says so.
 *
 * Power and heart rate are the bike's thresholds. Heart rate is still
 * used for another sport (a run, cross-country skiing), where it tends to
 * sit a few beats higher and so slightly overstates the load; power is
 * not, since a running or skiing wattage is on a different scale.
 *
 * The raw session RPE travels along whenever an RPE was given, whatever
 * method set the load, so a coach who thinks in minutes × RPE can see it.
 *
 * Pure: imports nothing from the database.
 */

export type Sport = "bike" | "strength" | "other";
export type LoadMethod = "power" | "hr" | "rpe" | "none";

export interface ActivityLoadInput {
  sport: Sport;
  /** Moving time. */
  seconds: number;
  /** The ride's power, one sample a second; null samples are coasting. */
  power1hz?: readonly (number | null)[] | null;
  /** Weighted power as the device or an earlier decode computed it. */
  weightedPower?: number | null;
  avgHr?: number | null;
  /** How hard it felt, 1–10. */
  rpe?: number | null;
}

export interface ActivityLoad {
  /** Whole load units. */
  load: number;
  method: LoadMethod;
  /** The share of threshold the load was computed from (power or heart rate), two decimals. */
  intensity?: number;
  /** Raw session RPE, minutes × RPE, when an RPE was given. */
  srpe?: number;
}

/** A whole session cannot average far above threshold heart rate. */
export const HR_RATIO_CAP = 1.05;
/** Below this share of threshold an average heart rate is a lost strap, not a ride. */
export const HR_RATIO_FLOOR = 0.4;

function positive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function byPower(input: ActivityLoadInput, ftp: number): ActivityLoad | null {
  const stream = input.power1hz && input.power1hz.length > 0 ? input.power1hz : null;
  const weighted = stream ? weightedPower(stream) : input.weightedPower;
  const seconds = positive(input.seconds) ? input.seconds : (stream?.length ?? 0);
  if (!positive(weighted) || !positive(seconds)) return null;
  const intensity = weighted / ftp;
  return {
    load: Math.round(loadAt(seconds, intensity)),
    method: "power",
    intensity: round2(intensity),
  };
}

function byHr(input: ActivityLoadInput, thresholdHr: number): ActivityLoad | null {
  if (!positive(input.avgHr) || !positive(input.seconds)) return null;
  const ratio = input.avgHr / thresholdHr;
  if (ratio < HR_RATIO_FLOOR) return null;
  const intensity = Math.min(ratio, HR_RATIO_CAP);
  return {
    load: Math.round(loadAt(input.seconds, intensity)),
    method: "hr",
    intensity: round2(intensity),
  };
}

function byRpe(input: ActivityLoadInput): ActivityLoad | null {
  if (!positive(input.rpe) || !positive(input.seconds)) return null;
  return { load: Math.round(rpeLoad(input.seconds / 60, input.rpe)), method: "rpe" };
}

/** The load of one activity; see the file comment for the order of methods. */
export function activityLoad(input: ActivityLoadInput, rider: Thresholds): ActivityLoad {
  let result: ActivityLoad | null = null;
  if (input.sport === "bike" && positive(rider.ftp)) result = byPower(input, rider.ftp);
  if (!result && input.sport !== "strength" && positive(rider.thresholdHr))
    result = byHr(input, rider.thresholdHr);
  if (!result) result = byRpe(input);
  if (!result) result = { load: 0, method: "none" };

  if (positive(input.rpe) && positive(input.seconds))
    result.srpe = sessionRpe(input.seconds / 60, input.rpe);
  return result;
}
