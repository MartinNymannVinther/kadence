import type { BikeStructure, Intent, Step } from "@/modules/workouts/structure";
import { powerBand } from "@/modules/workouts/export";
import { stepName, usable } from "./step-name";

/**
 * A bike session as a Garmin Training API workout: the JSON the Training
 * API takes to put a structured workout in the rider's Garmin Connect
 * calendar, from where it syncs to the Edge or the watch.
 *
 *     { "workoutName": "Threshold 3x10", "sport": "CYCLING",
 *       "workoutProvider": "Kadence", "workoutSourceId": "Kadence",
 *       "steps": [
 *         { "type": "WorkoutStep", "stepOrder": 1, "intensity": "WARMUP",
 *           "durationType": "TIME", "durationValue": 600,
 *           "targetType": "POWER", "targetValueLow": 140, "targetValueHigh": 188 },
 *         { "type": "WorkoutRepeatStep", "stepOrder": 2,
 *           "repeatType": "REPEAT_UNTIL_STEPS_CMPLT", "repeatValue": 3,
 *           "steps": [ … ] } ] }
 *
 * - Durations are time, in seconds.
 * - Power targets are watts, from the zone's band (ZONE_FTP_PCT) or the
 *   share of FTP as written, at the rider's FTP; heart rate targets are
 *   beats per minute at the rider's threshold. Without the threshold the
 *   step is OPEN and its description says what was meant.
 * - An RPE or no target is OPEN.
 * - Steps are numbered in order through the repeats, the repeat taking
 *   the number before its first step.
 * - Cadence is not sent: one target per step, as in the FIT workout.
 *
 * Garmin publishes the Training API's reference to approved partners only.
 * The shape here is the one partners have described publicly (workout
 * name, sport, steps of WorkoutStep and WorkoutRepeatStep); verify the
 * field names, the enumerations and the name limit against the partner
 * docs on approval. Pure.
 */

export type GarminIntensity = "WARMUP" | "COOLDOWN" | "RECOVERY" | "INTERVAL" | "ACTIVE";

export type GarminStep = {
  type: "WorkoutStep";
  stepOrder: number;
  intensity: GarminIntensity;
  description: string | null;
  durationType: "TIME";
  durationValue: number;
  targetType: "POWER" | "HEART_RATE" | "OPEN";
  targetValueLow: number | null;
  targetValueHigh: number | null;
};

export type GarminRepeat = {
  type: "WorkoutRepeatStep";
  stepOrder: number;
  repeatType: "REPEAT_UNTIL_STEPS_CMPLT";
  repeatValue: number;
  steps: GarminStep[];
};

export type GarminWorkout = {
  workoutName: string;
  description: string | null;
  sport: "CYCLING";
  workoutProvider: string;
  workoutSourceId: string;
  steps: Array<GarminStep | GarminRepeat>;
};

const INTENSITY: Record<Intent, GarminIntensity> = {
  warmup: "WARMUP",
  cooldown: "COOLDOWN",
  recover: "RECOVERY",
  work: "INTERVAL",
  steady: "ACTIVE",
};

const PROVIDER = "Kadence";
const NAME_CHARS = 64;

export function toGarminWorkout(
  structure: BikeStructure,
  rider: { ftp: number | null; thresholdHr: number | null },
  name: string,
  description = "",
): GarminWorkout {
  const ftp = usable(rider.ftp);
  const thresholdHr = usable(rider.thresholdHr);
  let order = 0;

  const step = (s: Step): GarminStep => {
    const row: GarminStep = {
      type: "WorkoutStep",
      stepOrder: ++order,
      intensity: INTENSITY[s.intent],
      description: stepName(s) || null,
      durationType: "TIME",
      durationValue: s.seconds,
      targetType: "OPEN",
      targetValueLow: null,
      targetValueHigh: null,
    };
    const band = powerBand(s.target);
    if (band && ftp) {
      const watts = (pct: number) => Math.round((pct / 100) * ftp);
      return {
        ...row,
        targetType: "POWER",
        targetValueLow: watts(band.low),
        targetValueHigh: watts(band.high),
      };
    }
    const t = s.target;
    if (t.kind === "hr_pct" && thresholdHr) {
      const bpm = (pct: number) => Math.round((pct / 100) * thresholdHr);
      return {
        ...row,
        targetType: "HEART_RATE",
        targetValueLow: bpm(Math.min(t.low, t.high)),
        targetValueHigh: bpm(Math.max(t.low, t.high)),
      };
    }
    return row;
  };

  const steps = structure.steps.map((item): GarminStep | GarminRepeat => {
    if (item.kind === "step") return step(item);
    const stepOrder = ++order;
    return {
      type: "WorkoutRepeatStep",
      stepOrder,
      repeatType: "REPEAT_UNTIL_STEPS_CMPLT",
      repeatValue: item.times,
      steps: item.steps.map(step),
    };
  });

  const text = description.trim().slice(0, 1000);
  return {
    workoutName: name.trim().slice(0, NAME_CHARS) || PROVIDER,
    description: text || null,
    sport: "CYCLING",
    workoutProvider: PROVIDER,
    workoutSourceId: PROVIDER,
    steps,
  };
}
