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
import type { BikeStructure, Intent, Step } from "@/modules/workouts/structure";
import { powerBand } from "./targets";

/**
 * A session as a FIT workout file, the format Garmin and Wahoo devices load
 * structured workouts from: a file_id of type workout, one workout message
 * (sport cycling, the number of steps, the name) and a workout_step per step.
 *
 * - Durations are time, in milliseconds.
 * - A zone or a share of FTP is a custom power target in percent of FTP
 *   (FIT's 0–1000 range), the zone's band from ZONE_FTP_PCT as low and
 *   high, so the device applies the FTP it knows.
 * - A share of threshold heart rate is a custom heart rate target in beats
 *   per minute (FIT writes bpm + 100) when the rider's threshold heart rate
 *   is known. FIT's other heart rate unit is percent of max heart rate,
 *   which is not the threshold's, so without a threshold the step is open.
 * - An RPE or no target is open: the device shows the time and nothing to
 *   hold.
 * - The intent sets the step's intensity: warmup, cooldown, rest for a
 *   recovery, active for work and steady riding.
 * - A repeat is its steps followed by a "repeat until steps complete" step
 *   whose duration value is the message index of the block's first step and
 *   whose target value is the number of times through the block. A repeat
 *   of one is just its steps.
 *
 * Cadence ranges are not written: FIT has one target per step, and power
 * or pulse is the one that matters.
 */

const NAME_BYTES = 64;
const STEP_NAME_BYTES = 48;

const INTENSITY_OF: Record<Intent, number> = {
  warmup: INTENSITY.warmup,
  cooldown: INTENSITY.cooldown,
  recover: INTENSITY.rest,
  work: INTENSITY.active,
  steady: INTENSITY.active,
};

interface StepRow {
  name?: string;
  durationType: number;
  durationValue: number;
  targetType: number;
  targetValue?: number;
  low?: number;
  high?: number;
  intensity?: number;
}

export function toFitWorkout(
  structure: BikeStructure,
  rider: { thresholdHr?: number | null },
  name: string,
  createdAt: Date = new Date(),
): Uint8Array {
  const rows = workoutRows(structure, rider.thresholdHr ?? null);
  // A time before FIT's epoch (or past its range) is written as no time.
  const created = msToFitTime(createdAt.getTime());
  const stepNameSize = Math.max(
    1,
    ...rows.map((row) => (row.name ? stringFieldSize(row.name, STEP_NAME_BYTES) : 1)),
  );

  const writer = new FitWriter()
    .define(0, MESG.fileId, [
      { num: FILE_ID.type, type: "enum" },
      { num: FILE_ID.manufacturer, type: "uint16" },
      { num: FILE_ID.product, type: "uint16" },
      { num: FILE_ID.timeCreated, type: "uint32" },
    ])
    .write(0, {
      [FILE_ID.type]: FILE_TYPE.workout,
      [FILE_ID.manufacturer]: MANUFACTURER.development,
      [FILE_ID.product]: 0,
      [FILE_ID.timeCreated]: created >= 0 && created < 0xffffffff ? created : null,
    })
    .define(1, MESG.workout, [
      { num: WORKOUT.name, type: "string", size: stringFieldSize(name, NAME_BYTES) },
      { num: WORKOUT.sport, type: "enum" },
      { num: WORKOUT.numValidSteps, type: "uint16" },
    ])
    .write(1, {
      [WORKOUT.name]: name,
      [WORKOUT.sport]: SPORT.cycling,
      [WORKOUT.numValidSteps]: rows.length,
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

function stepRow(step: Step, thresholdHr: number | null): StepRow {
  const row: StepRow = {
    name: step.label?.trim() || undefined,
    durationType: WKT_DURATION.time,
    durationValue: step.seconds * 1000,
    targetType: WKT_TARGET.open,
    intensity: INTENSITY_OF[step.intent],
  };

  const band = powerBand(step.target);
  if (band) return { ...row, targetType: WKT_TARGET.power, targetValue: 0, ...band };

  if (step.target.kind === "hr_pct" && thresholdHr !== null && thresholdHr > 0) {
    const bpm = (pct: number) => Math.round((pct / 100) * thresholdHr) + CUSTOM_HR_BPM_OFFSET;
    const { low, high } = step.target;
    return {
      ...row,
      targetType: WKT_TARGET.heartRate,
      targetValue: 0,
      low: bpm(Math.min(low, high)),
      high: bpm(Math.max(low, high)),
    };
  }
  return row;
}
