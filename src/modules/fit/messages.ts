import type { FieldValue } from "./base-types";
import {
  ACTIVITY,
  EVENT,
  FIELD_MESSAGE_INDEX,
  FIELD_TIMESTAMP,
  FILE_ID,
  FIT_MIN_ABSOLUTE_TIME,
  fitTimeToMs,
  LAP,
  RECORD,
  SEMICIRCLE_TO_DEG,
  SESSION,
  SPORT_MESG,
  WORKOUT,
  WORKOUT_STEP,
} from "./profile";
import type {
  FitActivity,
  FitEvent,
  FitLap,
  FitRecord,
  FitSession,
  FitWorkout,
  FitWorkoutStep,
} from "./types";

/**
 * From a data message's raw fields to Kadence's shapes: FIT's integers
 * scaled into metres, seconds and degrees, enhanced fields preferred over
 * the plain ones they extend, and "no value" left out. One function per
 * message; the field numbers and scales are in `profile.ts`.
 */

type Fields = ReadonlyMap<number, FieldValue>;

function num(fields: Fields, field: number): number | undefined {
  const value = fields.get(field);
  return typeof value === "number" ? value : undefined;
}

function text(fields: Fields, field: number): string | undefined {
  const value = fields.get(field);
  return typeof value === "string" ? value : undefined;
}

/** `raw / scale - offset`, FIT's rule for every scaled field. */
function scaled(fields: Fields, field: number, scale: number, offset = 0): number | undefined {
  const value = num(fields, field);
  return value === undefined ? undefined : value / scale - offset;
}

/** An absolute date_time as epoch milliseconds; a time since power-on is no date. */
function time(fields: Fields, field: number): number | undefined {
  const value = num(fields, field);
  return value !== undefined && value >= FIT_MIN_ABSOLUTE_TIME ? fitTimeToMs(value) : undefined;
}

function degrees(fields: Fields, field: number, limit: number): number | undefined {
  const value = num(fields, field);
  if (value === undefined) return undefined;
  const deg = value * SEMICIRCLE_TO_DEG;
  return Math.abs(deg) <= limit ? deg : undefined;
}

export interface FileIdInfo {
  fileType?: number;
  manufacturer?: number;
  product?: number;
  timeCreated?: number;
}

export function toFileId(fields: Fields): FileIdInfo {
  return {
    fileType: num(fields, FILE_ID.type),
    manufacturer: num(fields, FILE_ID.manufacturer),
    product: num(fields, FILE_ID.product),
    timeCreated: time(fields, FILE_ID.timeCreated),
  };
}

/** A record without a time cannot be placed on the ride and is dropped. */
export function toRecord(fields: Fields, timestamp: number | undefined): FitRecord | undefined {
  if (timestamp === undefined) return undefined;
  return {
    t: fitTimeToMs(timestamp),
    power: num(fields, RECORD.power),
    hr: num(fields, RECORD.heartRate),
    cadence: num(fields, RECORD.cadence),
    speed: scaled(fields, RECORD.enhancedSpeed, 1000) ?? scaled(fields, RECORD.speed, 1000),
    distance: scaled(fields, RECORD.distance, 100),
    altitude:
      scaled(fields, RECORD.enhancedAltitude, 5, 500) ?? scaled(fields, RECORD.altitude, 5, 500),
    lat: degrees(fields, RECORD.positionLat, 90),
    lon: degrees(fields, RECORD.positionLong, 180),
  };
}

export function toSession(fields: Fields): FitSession {
  return {
    t: time(fields, FIELD_TIMESTAMP),
    startTime: time(fields, SESSION.startTime),
    sport: num(fields, SESSION.sport),
    subSport: num(fields, SESSION.subSport),
    elapsedSeconds: scaled(fields, SESSION.totalElapsedTime, 1000),
    timerSeconds: scaled(fields, SESSION.totalTimerTime, 1000),
    distanceM: scaled(fields, SESSION.totalDistance, 100),
    ascentM: num(fields, SESSION.totalAscent),
    descentM: num(fields, SESSION.totalDescent),
    calories: num(fields, SESSION.totalCalories),
    avgPower: num(fields, SESSION.avgPower),
    maxPower: num(fields, SESSION.maxPower),
    avgHr: num(fields, SESSION.avgHeartRate),
    maxHr: num(fields, SESSION.maxHeartRate),
    avgCadence: num(fields, SESSION.avgCadence),
  };
}

export function toLap(fields: Fields): FitLap {
  return {
    t: time(fields, FIELD_TIMESTAMP),
    startTime: time(fields, LAP.startTime),
    elapsedSeconds: scaled(fields, LAP.totalElapsedTime, 1000),
    timerSeconds: scaled(fields, LAP.totalTimerTime, 1000),
    distanceM: scaled(fields, LAP.totalDistance, 100),
    avgPower: num(fields, LAP.avgPower),
    maxPower: num(fields, LAP.maxPower),
    avgHr: num(fields, LAP.avgHeartRate),
    maxHr: num(fields, LAP.maxHeartRate),
    avgCadence: num(fields, LAP.avgCadence),
  };
}

export function toEvent(fields: Fields, timestamp: number | undefined): FitEvent {
  return {
    t: timestamp === undefined ? undefined : fitTimeToMs(timestamp),
    event: num(fields, EVENT.event),
    eventType: num(fields, EVENT.eventType),
    data: num(fields, EVENT.data),
  };
}

/** The largest gap between local time and UTC anywhere on Earth, plus slack. */
const MAX_LOCAL_OFFSET_SECONDS = 15 * 3600;

export function toActivity(fields: Fields): FitActivity {
  const utc = num(fields, FIELD_TIMESTAMP);
  const local = num(fields, ACTIVITY.localTimestamp);
  const offset = utc !== undefined && local !== undefined ? local - utc : undefined;
  return {
    t: time(fields, FIELD_TIMESTAMP),
    timerSeconds: scaled(fields, ACTIVITY.totalTimerTime, 1000),
    numSessions: num(fields, ACTIVITY.numSessions),
    localOffsetSeconds:
      offset !== undefined && Math.abs(offset) <= MAX_LOCAL_OFFSET_SECONDS ? offset : undefined,
  };
}

export function toSport(fields: Fields): { sport?: number; subSport?: number; name?: string } {
  return {
    sport: num(fields, SPORT_MESG.sport),
    subSport: num(fields, SPORT_MESG.subSport),
    name: text(fields, SPORT_MESG.name),
  };
}

export function toWorkout(fields: Fields): FitWorkout {
  return {
    name: text(fields, WORKOUT.name),
    sport: num(fields, WORKOUT.sport),
    subSport: num(fields, WORKOUT.subSport),
    numValidSteps: num(fields, WORKOUT.numValidSteps),
  };
}

export function toWorkoutStep(fields: Fields): FitWorkoutStep {
  return {
    messageIndex: num(fields, FIELD_MESSAGE_INDEX),
    name: text(fields, WORKOUT_STEP.name),
    durationType: num(fields, WORKOUT_STEP.durationType),
    durationValue: num(fields, WORKOUT_STEP.durationValue),
    targetType: num(fields, WORKOUT_STEP.targetType),
    targetValue: num(fields, WORKOUT_STEP.targetValue),
    customTargetLow: num(fields, WORKOUT_STEP.customTargetLow),
    customTargetHigh: num(fields, WORKOUT_STEP.customTargetHigh),
    intensity: num(fields, WORKOUT_STEP.intensity),
    notes: text(fields, WORKOUT_STEP.notes),
  };
}
