import {
  CUSTOM_HR_BPM_OFFSET,
  FIELD_MESSAGE_INDEX,
  FILE_ID,
  FILE_TYPE,
  FitWriter,
  INTENSITY,
  MANUFACTURER,
  MESG,
  msToFitTime,
  SPORT,
  stringFieldSize,
  WKT_DURATION,
  WKT_TARGET,
  WORKOUT,
  WORKOUT_STEP,
  type FitValues,
} from "@/modules/fit";
import type { BikeStructure, Intent, Step, Target } from "@/modules/workouts/structure";
import { powerBand } from "./targets";

/**
 * A session as a FIT workout file, the format Garmin and Wahoo devices load
 * structured workouts from: a file_id of type workout, one workout message
 * (sport cycling, the number of steps, the name) and a workout_step per step.
 *
 * - The file_id carries a serial number for this version of the session.
 *   A Garmin tells workout files apart by type, maker, product and serial
 *   number (the FIT SDK's cookbook), so without one every file from
 *   Kadence would be the same file to it.
 * - Durations are time, in milliseconds.
 * - A zone or a share of FTP is a custom power target in percent of FTP
 *   (FIT's 0–1000 range), the zone's band from ZONE_FTP_PCT as low and
 *   high, so the device applies the FTP it knows.
 * - A share of threshold heart rate is a custom heart rate target in beats
 *   per minute (FIT writes bpm + 100) when the rider's threshold heart rate
 *   is known. FIT's other heart rate unit is percent of max heart rate,
 *   which is not the threshold's, so without a threshold the step is open.
 * - An RPE or no target is open: the device shows the time and nothing to
 *   hold, and the step's notes say how hard it should feel.
 * - A step is named by the coach's label, or else by its target in short
 *   ("Z3", "90-95% FTP", "RPE 7"), so the device says what the step is.
 * - A cadence range rides beside power or pulse as the step's secondary
 *   target; on a step with nothing else to hold it is the target.
 * - The intent sets the step's intensity: warmup, cooldown, rest for a
 *   recovery, active for work and steady riding.
 * - A repeat is its steps followed by a "repeat until steps complete" step
 *   whose duration value is the message index of the block's first step and
 *   whose target value is the number of times through the block. A repeat
 *   of one is just its steps.
 * - The session's description is the workout's.
 *
 * Field numbers are Garmin's FIT profile's (src/modules/fit/profile.ts).
 */

const NAME_BYTES = 64;
const STEP_NAME_BYTES = 48;
const NOTES_BYTES = 64;
const DESCRIPTION_BYTES = 128;

export interface FitWorkoutOptions {
  /** This version of the session (`versionSerial`); none is written without it. */
  serial?: number;
  description?: string;
}

/** A 32-bit serial for one version of a session: FNV-1a of its id and version, never 0 (uint32z's "none"). */
export function versionSerial(id: string, version: number): number {
  let hash = 0x811c9dc5;
  for (const char of `${id}:${version}`) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash === 0 ? 1 : hash;
}

const INTENSITY_OF: Record<Intent, number> = {
  warmup: INTENSITY.warmup,
  cooldown: INTENSITY.cooldown,
  recover: INTENSITY.rest,
  work: INTENSITY.active,
  steady: INTENSITY.active,
};

interface StepRow {
  name?: string;
  notes?: string;
  durationType: number;
  durationValue: number;
  targetType: number;
  targetValue?: number;
  low?: number;
  high?: number;
  intensity?: number;
  secondary?: { low: number; high: number };
}

export function toFitWorkout(
  structure: BikeStructure,
  rider: { thresholdHr?: number | null },
  name: string,
  createdAt: Date = new Date(),
  options: FitWorkoutOptions = {},
): Uint8Array {
  const rows = workoutRows(structure, rider.thresholdHr ?? null);
  // A time before FIT's epoch (or past its range) is written as no time.
  const created = msToFitTime(createdAt.getTime());
  const sizeOf = (texts: Array<string | undefined>, cap: number) =>
    Math.max(1, ...texts.map((text) => (text ? stringFieldSize(text, cap) : 1)));
  const stepNameSize = sizeOf(
    rows.map((row) => row.name),
    STEP_NAME_BYTES,
  );
  const notesSize = sizeOf(
    rows.map((row) => row.notes),
    NOTES_BYTES,
  );
  const description = options.description?.trim() || undefined;

  const writer = new FitWriter()
    .define(0, MESG.fileId, [
      { num: FILE_ID.type, type: "enum" },
      { num: FILE_ID.manufacturer, type: "uint16" },
      { num: FILE_ID.product, type: "uint16" },
      { num: FILE_ID.serialNumber, type: "uint32z" },
      { num: FILE_ID.timeCreated, type: "uint32" },
    ])
    .write(0, {
      [FILE_ID.type]: FILE_TYPE.workout,
      [FILE_ID.manufacturer]: MANUFACTURER.development,
      [FILE_ID.product]: 0,
      [FILE_ID.serialNumber]: options.serial ?? null,
      [FILE_ID.timeCreated]: created >= 0 && created < 0xffffffff ? created : null,
    })
    .define(1, MESG.workout, [
      { num: WORKOUT.name, type: "string", size: stringFieldSize(name, NAME_BYTES) },
      { num: WORKOUT.sport, type: "enum" },
      { num: WORKOUT.numValidSteps, type: "uint16" },
      ...(description
        ? [
            {
              num: WORKOUT.description,
              type: "string" as const,
              size: stringFieldSize(description, DESCRIPTION_BYTES),
            },
          ]
        : []),
    ])
    .write(1, {
      [WORKOUT.name]: name,
      [WORKOUT.sport]: SPORT.cycling,
      [WORKOUT.numValidSteps]: rows.length,
      [WORKOUT.description]: description,
    })
    .define(2, MESG.workoutStep, [
      { num: FIELD_MESSAGE_INDEX, type: "uint16" },
      { num: WORKOUT_STEP.name, type: "string", size: stepNameSize },
      { num: WORKOUT_STEP.durationType, type: "enum" },
      { num: WORKOUT_STEP.durationValue, type: "uint32" },
      { num: WORKOUT_STEP.targetType, type: "enum" },
      { num: WORKOUT_STEP.targetValue, type: "uint32" },
      { num: WORKOUT_STEP.customTargetLow, type: "uint32" },
      { num: WORKOUT_STEP.customTargetHigh, type: "uint32" },
      { num: WORKOUT_STEP.intensity, type: "enum" },
      { num: WORKOUT_STEP.notes, type: "string", size: notesSize },
      { num: WORKOUT_STEP.secondaryTargetType, type: "enum" },
      { num: WORKOUT_STEP.secondaryTargetValue, type: "uint32" },
      { num: WORKOUT_STEP.secondaryCustomTargetLow, type: "uint32" },
      { num: WORKOUT_STEP.secondaryCustomTargetHigh, type: "uint32" },
    ]);

  rows.forEach((row, index) => {
    const values: FitValues = {
      [FIELD_MESSAGE_INDEX]: index,
      [WORKOUT_STEP.name]: row.name,
      [WORKOUT_STEP.durationType]: row.durationType,
      [WORKOUT_STEP.durationValue]: row.durationValue,
      [WORKOUT_STEP.targetType]: row.targetType,
      [WORKOUT_STEP.targetValue]: row.targetValue,
      [WORKOUT_STEP.customTargetLow]: row.low,
      [WORKOUT_STEP.customTargetHigh]: row.high,
      [WORKOUT_STEP.intensity]: row.intensity,
      [WORKOUT_STEP.notes]: row.notes,
      [WORKOUT_STEP.secondaryTargetType]: row.secondary ? WKT_TARGET.cadence : null,
      [WORKOUT_STEP.secondaryTargetValue]: row.secondary ? 0 : null,
      [WORKOUT_STEP.secondaryCustomTargetLow]: row.secondary?.low,
      [WORKOUT_STEP.secondaryCustomTargetHigh]: row.secondary?.high,
    };
    writer.write(2, values);
  });
  return writer.finish();
}

function workoutRows(structure: BikeStructure, thresholdHr: number | null): StepRow[] {
  const rows: StepRow[] = [];
  for (const item of structure.steps) {
    if (item.kind === "step") {
      rows.push(stepRow(item, thresholdHr));
      continue;
    }
    const first = rows.length;
    for (const step of item.steps) rows.push(stepRow(step, thresholdHr));
    if (item.times > 1)
      rows.push({
        durationType: WKT_DURATION.repeatUntilStepsCmplt,
        durationValue: first,
        targetType: WKT_TARGET.open,
        targetValue: item.times,
      });
  }
  return rows;
}

/** The target in a few characters a bike computer can show: "Z3", "90-95% FTP", "RPE 7". */
function targetName(target: Target): string | undefined {
  const range = (low: number, high: number) => `${Math.min(low, high)}-${Math.max(low, high)}`;
  switch (target.kind) {
    case "zone":
      return `Z${target.zone}`;
    case "ftp_pct":
      return `${range(target.low, target.high)}% FTP`;
    case "hr_pct":
      return `${range(target.low, target.high)}% LTHR`;
    case "rpe":
      return `RPE ${target.value}`;
    case "open":
      return undefined;
  }
}

/** A cadence range from the step's two ends, or null when it names none. */
function cadenceRange(step: Step): { low: number; high: number } | null {
  const low = step.cadenceLow ?? step.cadenceHigh;
  const high = step.cadenceHigh ?? step.cadenceLow;
  if (low === undefined || high === undefined) return null;
  return { low: Math.min(low, high), high: Math.max(low, high) };
}

function stepRow(step: Step, thresholdHr: number | null): StepRow {
  const hasThreshold = thresholdHr !== null && thresholdHr > 0;
  const row: StepRow = {
    name: step.label?.trim() || targetName(step.target),
    // What the device cannot hold is said in words.
    notes:
      step.target.kind === "rpe"
        ? `RPE ${step.target.value}/10`
        : step.target.kind === "hr_pct" && !hasThreshold
          ? targetName(step.target)
          : undefined,
    durationType: WKT_DURATION.time,
    durationValue: step.seconds * 1000,
    targetType: WKT_TARGET.open,
    intensity: INTENSITY_OF[step.intent],
  };
  const cadence = cadenceRange(step);

  const band = powerBand(step.target);
  if (band)
    return {
      ...row,
      targetType: WKT_TARGET.power,
      targetValue: 0,
      ...band,
      secondary: cadence ?? undefined,
    };

  if (step.target.kind === "hr_pct" && hasThreshold) {
    const bpm = (pct: number) => Math.round((pct / 100) * thresholdHr) + CUSTOM_HR_BPM_OFFSET;
    const { low, high } = step.target;
    return {
      ...row,
      targetType: WKT_TARGET.heartRate,
      targetValue: 0,
      low: bpm(Math.min(low, high)),
      high: bpm(Math.max(low, high)),
      secondary: cadence ?? undefined,
    };
  }
  // Nothing else to hold: the cadence is the target.
  if (cadence) return { ...row, targetType: WKT_TARGET.cadence, targetValue: 0, ...cadence };
  return row;
}
