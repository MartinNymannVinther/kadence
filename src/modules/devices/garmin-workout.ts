import {
  ZONE_FTP_PCT,
  ZONE_HR_PCT,
  ZONES,
  type BikeStructure,
  type Intent,
  type Step,
  type Zone,
} from "@/modules/workouts/structure";
import { powerBand } from "@/modules/workouts/export";
import { stepName, usable } from "./step-name";

/**
 * A bike session as a workout for Garmin's Training API, version 2
 * (docs/adr/0114): one segment of sport CYCLING holding the steps, from
 * where Garmin Connect syncs it to the rider's Edge or watch.
 *
 * - Durations are time, in seconds.
 * - Targets are fixed numbers worked out from Kadence's own thresholds,
 *   as the workout files are: watts from the zone's band (ZONE_FTP_PCT)
 *   or the share of FTP as written, at the rider's FTP; beats per minute
 *   from a share of threshold heart rate.
 * - Without an FTP, a power step falls back to heart rate: the same zone
 *   of Kadence's one zone model seen from the other sensor (ZONE_HR_PCT),
 *   at the threshold heart rate. Without that either, the step is open.
 * - A cadence range rides beside power or pulse as the secondary target,
 *   and is the target on a step with nothing else to hold; Garmin takes
 *   a secondary target only beside a primary one.
 * - An RPE, or a target the rider's thresholds cannot turn into a number,
 *   is open, and the step's description says what was meant ("RPE 7",
 *   "Z3"), as on the device's own files.
 * - Steps are numbered in order through the repeats, the repeat taking
 *   the number before its first step. A repeat of one is just its steps.
 * - Garmin takes at most GARMIN_MAX_STEPS steps in a single-sport workout,
 *   counting the repeats; a longer session is not sent (`garminStepCount`).
 *
 * Pure: the same session and thresholds give the same JSON, which is what
 * the hash of what was sent is taken over (workout-sync.ts).
 */

export const GARMIN_MAX_STEPS = 100;
const DESCRIPTION_CHARS = 1024;
const STEP_DESCRIPTION_CHARS = 512;
/** The doc names no limit for the name; a long title is cut rather than risked. */
const NAME_CHARS = 64;
/** Shown to the rider in Garmin Connect; Garmin allows 20 characters. */
const PROVIDER = "Kadence";

export type GarminIntensity = "WARMUP" | "COOLDOWN" | "RECOVERY" | "INTERVAL" | "ACTIVE";
type Measured = "POWER" | "HEART_RATE" | "CADENCE";

export type GarminStep = {
  type: "WorkoutStep";
  stepOrder: number;
  intensity: GarminIntensity;
  description: string | null;
  durationType: "TIME";
  durationValue: number;
  targetType: Measured | "OPEN";
  targetValue: null;
  targetValueLow: number | null;
  targetValueHigh: number | null;
  secondaryTargetType: "CADENCE" | null;
  secondaryTargetValue: null;
  secondaryTargetValueLow: number | null;
  secondaryTargetValueHigh: number | null;
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
  isSessionTransitionEnabled: false;
  segments: [{ segmentOrder: 1; sport: "CYCLING"; steps: Array<GarminStep | GarminRepeat> }];
};

export type Thresholds = { ftp: number | null; thresholdHr: number | null };

const INTENSITY: Record<Intent, GarminIntensity> = {
  warmup: "WARMUP",
  cooldown: "COOLDOWN",
  recover: "RECOVERY",
  work: "INTERVAL",
  steady: "ACTIVE",
};

type Range = { low: number; high: number };

/** How many steps Garmin counts in the session: every step and every repeat of more than one. */
export function garminStepCount(structure: BikeStructure): number {
  return structure.steps.reduce(
    (n, item) => (item.kind === "step" ? n + 1 : n + item.steps.length + (item.times > 1 ? 1 : 0)),
    0,
  );
}

/** The zone whose power band holds `pct` percent of FTP. */
function zoneOfFtpPct(pct: number): Zone {
  return ZONES.find((zone) => pct <= ZONE_FTP_PCT[zone].high) ?? 7;
}

function cadenceRange(step: Step): Range | null {
  const low = step.cadenceLow ?? step.cadenceHigh;
  const high = step.cadenceHigh ?? step.cadenceLow;
  if (low === undefined || high === undefined) return null;
  return { low: Math.min(low, high), high: Math.max(low, high) };
}

/** What a step holds the rider to, in watts or beats, or null for an open step. */
function primaryTarget(step: Step, rider: Thresholds): { type: Measured; range: Range } | null {
  const ftp = usable(rider.ftp);
  const thresholdHr = usable(rider.thresholdHr);
  const of = (base: number, band: Range): Range => ({
    low: Math.round((Math.min(band.low, band.high) / 100) * base),
    high: Math.round((Math.max(band.low, band.high) / 100) * base),
  });
  const target = step.target;
  const band = powerBand(target);
  if (band && ftp) return { type: "POWER", range: of(ftp, band) };
  if (band && thresholdHr) {
    const zone =
      target.kind === "zone"
        ? (ZONES.find((z) => z === target.zone) ?? 1)
        : zoneOfFtpPct((band.low + band.high) / 2);
    return { type: "HEART_RATE", range: of(thresholdHr, ZONE_HR_PCT[zone]) };
  }
  if (target.kind === "hr_pct" && thresholdHr)
    return { type: "HEART_RATE", range: of(thresholdHr, target) };
  return null;
}

export function toGarminWorkout(
  structure: BikeStructure,
  rider: Thresholds,
  name: string,
  description = "",
): GarminWorkout {
  let order = 0;

  const step = (s: Step): GarminStep => {
    const primary = primaryTarget(s, rider);
    const cadence = cadenceRange(s);
    const main = primary ?? (cadence ? { type: "CADENCE" as const, range: cadence } : null);
    const secondary = primary && cadence ? cadence : null;
    return {
      type: "WorkoutStep",
      stepOrder: ++order,
      intensity: INTENSITY[s.intent],
      description: stepName(s).slice(0, STEP_DESCRIPTION_CHARS) || null,
      durationType: "TIME",
      durationValue: s.seconds,
      targetType: main?.type ?? "OPEN",
      targetValue: null,
      targetValueLow: main?.range.low ?? null,
      targetValueHigh: main?.range.high ?? null,
      secondaryTargetType: secondary ? "CADENCE" : null,
      secondaryTargetValue: null,
      secondaryTargetValueLow: secondary?.low ?? null,
      secondaryTargetValueHigh: secondary?.high ?? null,
    };
  };

  const steps = structure.steps.flatMap((item): Array<GarminStep | GarminRepeat> => {
    if (item.kind === "step") return [step(item)];
    if (item.times <= 1) return item.steps.map(step);
    const stepOrder = ++order;
    return [
      {
        type: "WorkoutRepeatStep",
        stepOrder,
        repeatType: "REPEAT_UNTIL_STEPS_CMPLT",
        repeatValue: item.times,
        steps: item.steps.map(step),
      },
    ];
  });

  const text = description.trim().slice(0, DESCRIPTION_CHARS);
  return {
    workoutName: name.trim().slice(0, NAME_CHARS) || PROVIDER,
    description: text || null,
    sport: "CYCLING",
    workoutProvider: PROVIDER,
    workoutSourceId: PROVIDER,
    isSessionTransitionEnabled: false,
    segments: [{ segmentOrder: 1, sport: "CYCLING", steps }],
  };
}
