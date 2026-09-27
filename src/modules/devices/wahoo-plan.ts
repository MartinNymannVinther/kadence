import {
  flattenSteps,
  type BikeStructure,
  type Intent,
  type Step,
} from "@/modules/workouts/structure";
import { powerBand } from "@/modules/workouts/export";
import { stepName, usable } from "./step-name";

/**
 * A bike session as a Wahoo plan: Wahoo's own JSON plan format ("Public
 * plan.json File Format", version 1.0.0, linked from
 * cloud-api.wahooligan.com as plan-json-format.pdf), which the ELEMNT and
 * the Wahoo app play as a structured workout.
 *
 *     { "header": { "name", "version": "1.0.0", "workout_type_family": 0,
 *                   "workout_type_location": 1, "ftp": 250, … },
 *       "intervals": [ { "name", "exit_trigger_type": "time",
 *                        "exit_trigger_value": 600, "intensity_type": "wu",
 *                        "targets": [ { "type": "ftp", "low": 0.56, "high": 0.75 } ] },
 *                      { "exit_trigger_type": "repeat", "exit_trigger_value": 2,
 *                        "intervals": [ … ] } ] }
 *
 * - Durations are time, in seconds.
 * - A zone or a share of FTP is an `ftp` target, a fraction of FTP from
 *   the zone's band (ZONE_FTP_PCT) or the range as written. The format
 *   only accepts it when the header carries the athlete's FTP, so the
 *   rider's FTP goes in the header; without one there is no power target
 *   and the step's name says what was meant.
 * - A share of threshold heart rate is an absolute `hr` target in beats per
 *   minute from the rider's threshold. The format's relative
 *   `threshold_hr` is, by its own footnote, not supported on ELEMNT bike
 *   computers.
 * - An RPE is an `rpe` target; no target is no target.
 * - A cadence range is a second, `rpm` target.
 * - A repeat is an interval with `exit_trigger_type: "repeat"`, whose value
 *   counts the times *after* the first: three times through is 2.
 * - The intent is the interval's `intensity_type`: wu, cd, recover, and
 *   active for work and steady riding.
 *
 * The location is outdoor (1): the format requires one, a planned session
 * does not say, and the head unit on the bike is where a youth road rider
 * meets it. Pure.
 */

export type WahooTarget = { type: "ftp" | "hr" | "rpe" | "rpm"; low: number; high: number };

export type WahooInterval = {
  name?: string;
  exit_trigger_type: "time" | "repeat";
  exit_trigger_value: number;
  intensity_type?: "wu" | "cd" | "recover" | "active";
  targets?: WahooTarget[];
  intervals?: WahooInterval[];
};

export type WahooPlan = {
  header: {
    name: string;
    version: "1.0.0";
    description?: string;
    duration_s: number;
    workout_type_family: 0;
    workout_type_location: 0 | 1;
    ftp?: number;
  };
  intervals: WahooInterval[];
};

export const WAHOO_PLAN_VERSION = "1.0.0";
const BIKING = 0;
const OUTDOOR = 1;

const INTENSITY: Record<Intent, NonNullable<WahooInterval["intensity_type"]>> = {
  warmup: "wu",
  cooldown: "cd",
  recover: "recover",
  work: "active",
  steady: "active",
};

/** A fraction of FTP with two decimals, as the format's examples write it. */
const fraction = (pct: number) => Math.round(pct) / 100;

export function toWahooPlan(
  structure: BikeStructure,
  rider: { ftp: number | null; thresholdHr: number | null },
  name: string,
  description = "",
): WahooPlan {
  const ftp = usable(rider.ftp);
  const thresholdHr = usable(rider.thresholdHr);

  const interval = (step: Step): WahooInterval => {
    const targets: WahooTarget[] = [];
    const band = powerBand(step.target);
    if (band && ftp)
      targets.push({ type: "ftp", low: fraction(band.low), high: fraction(band.high) });
    const t = step.target;
    if (t.kind === "hr_pct" && thresholdHr) {
      const bpm = (pct: number) => Math.round((pct / 100) * thresholdHr);
      targets.push({
        type: "hr",
        low: bpm(Math.min(t.low, t.high)),
        high: bpm(Math.max(t.low, t.high)),
      });
    }
    if (t.kind === "rpe") targets.push({ type: "rpe", low: t.value, high: t.value });
    const low = step.cadenceLow ?? step.cadenceHigh;
    const high = step.cadenceHigh ?? step.cadenceLow;
    if (low !== undefined && high !== undefined)
      targets.push({ type: "rpm", low: Math.min(low, high), high: Math.max(low, high) });
    const label = stepName(step);
    return {
      ...(label ? { name: label } : {}),
      exit_trigger_type: "time",
      exit_trigger_value: step.seconds,
      intensity_type: INTENSITY[step.intent],
      targets,
    };
  };

  const intervals: WahooInterval[] = structure.steps.map((item) =>
    item.kind === "step"
      ? interval(item)
      : {
          name: `${item.times}x`,
          exit_trigger_type: "repeat",
          exit_trigger_value: item.times - 1,
          intervals: item.steps.map(interval),
        },
  );

  const text = description.trim().slice(0, 5000);
  return {
    header: {
      name: name.trim().slice(0, 100) || "Kadence",
      version: WAHOO_PLAN_VERSION,
      ...(text ? { description: text } : {}),
      duration_s: flattenSteps(structure).reduce((sum, step) => sum + step.seconds, 0),
      workout_type_family: BIKING,
      workout_type_location: OUTDOOR,
      ...(ftp ? { ftp: Math.round(ftp) } : {}),
    },
    intervals,
  };
}
