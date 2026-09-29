import {
  ACTIVITY,
  EVENT,
  FILE_ID,
  FILE_TYPE,
  FitWriter,
  INTENSITY,
  LAP,
  MANUFACTURER,
  MESG,
  msToFitTime,
  RECORD,
  SESSION,
  SPORT,
  stringFieldSize,
  SUB_SPORT,
} from "@/modules/fit";
import { totals, type Recording } from "./recording";

/**
 * A ride from Rulle as a FIT activity file, written with Kadence's own
 * FitWriter: what a bike computer on a trainer writes, so the ride goes
 * through the same decoder, the same summary, the same load and the same
 * plan-against-ride as any other (ADR 0033), and opens in anything else
 * that reads FIT when the rider takes it with them.
 *
 * - `file_id`: an activity by "development" (255: software, not a device
 *   maker), named "Kadence Rulle".
 * - A timer start, then one record a second — watt, cadence, pulse, and
 *   the course's speed, distance and height — with a timer stop at each
 *   pause and a start where it ends.
 * - One lap per block ridden, with its intensity (warm-up, work, recovery,
 *   cool-down), times, distance and averages.
 * - The session: cycling, indoor (sub-sport 6); and the activity.
 *
 * No position is written. The route is a picture to ride through, not a
 * place the rider was, so the ride never draws itself on a map in Vejle
 * and never finds a teammate "riding together" on the same virtual road.
 */

const PRODUCT_NAME = "Kadence Rulle";
const PRODUCT_NAME_FIELD = 8;
/** Enum `event`: the timer, a lap, the session, the activity. */
const EVENT_KIND = { timer: 0, session: 8, lap: 9, activity: 26 } as const;
/** Enum `event_type`. */
const EVENT_TYPE = { start: 0, stop: 1, stopAll: 4 } as const;
const LAP_EVENT = 0;
const LAP_EVENT_TYPE = 1;
const LAP_INTENSITY = 23;
const SESSION_FIRST_LAP = 25;
const SESSION_NUM_LAPS = 26;
const ACTIVITY_TYPE = 2;
const ACTIVITY_EVENT = 3;
const ACTIVITY_EVENT_TYPE = 4;
const MESSAGE_INDEX = 254;

const INTENT_INTENSITY: Record<string, number> = {
  warmup: INTENSITY.warmup,
  cooldown: INTENSITY.cooldown,
  recover: INTENSITY.rest,
};

export type RideFitOptions = {
  /** Seconds local time is ahead of UTC where the ride was ridden (Copenhagen: 3600 or 7200). */
  localOffsetSeconds?: number;
};

export function rideToFit(rec: Recording, options: RideFitOptions = {}): Uint8Array {
  const at = (second: number) => msToFitTime(rec.startedAt + second * 1000);
  const sum = totals(rec);
  const end = rec.endedAt ?? sum.elapsedSeconds;
  const writer = new FitWriter()
    .define(0, MESG.fileId, [
      { num: FILE_ID.type, type: "enum" },
      { num: FILE_ID.manufacturer, type: "uint16" },
      { num: FILE_ID.timeCreated, type: "uint32" },
      { num: PRODUCT_NAME_FIELD, type: "string", size: stringFieldSize(PRODUCT_NAME, 32) },
    ])
    .write(0, {
      [FILE_ID.type]: FILE_TYPE.activity,
      [FILE_ID.manufacturer]: MANUFACTURER.development,
      [FILE_ID.timeCreated]: at(0),
      [PRODUCT_NAME_FIELD]: PRODUCT_NAME,
    })
    .define(1, MESG.event, [
      { num: 253, type: "uint32" },
      { num: EVENT.event, type: "enum" },
      { num: EVENT.eventType, type: "enum" },
    ])
    .define(2, MESG.record, [
      { num: 253, type: "uint32" },
      { num: RECORD.heartRate, type: "uint8" },
      { num: RECORD.cadence, type: "uint8" },
      { num: RECORD.distance, type: "uint32" },
      { num: RECORD.power, type: "uint16" },
      { num: RECORD.enhancedSpeed, type: "uint32" },
      { num: RECORD.enhancedAltitude, type: "uint32" },
    ]);
  const timer = (second: number, type: number) =>
    writer.write(1, { 253: at(second), [EVENT.event]: EVENT_KIND.timer, [EVENT.eventType]: type });

  timer(0, EVENT_TYPE.start);
  // Pauses and samples in time order: a pause's stop comes after the last
  // second before it, and its start before the first second after it.
  const pauses = [...rec.pauses];
  const pauseBefore = (limit: number) => {
    while (pauses.length > 0 && pauses[0]!.from < limit) {
      const pause = pauses.shift()!;
      timer(pause.from, EVENT_TYPE.stopAll);
      if (pause.to !== null && pause.to < end) timer(pause.to, EVENT_TYPE.start);
    }
  };
  rec.t.forEach((second, i) => {
    pauseBefore(second);
    writer.write(2, {
      253: at(second),
      [RECORD.heartRate]: whole(rec.hr[i], 0, 254),
      [RECORD.cadence]: whole(rec.cadence[i], 0, 254),
      [RECORD.distance]: scaled(rec.distance[i], 100),
      [RECORD.power]: whole(rec.power[i], 0, 65534),
      [RECORD.enhancedSpeed]: scaled(rec.speed[i], 1000),
      [RECORD.enhancedAltitude]: scaled(
        rec.altitude[i] === null ? null : rec.altitude[i]! + 500,
        5,
      ),
    });
  });
  pauseBefore(end);
  timer(end, EVENT_TYPE.stopAll);

  writer.define(3, MESG.lap, [
    { num: 253, type: "uint32" },
    { num: MESSAGE_INDEX, type: "uint16" },
    { num: LAP_EVENT, type: "enum" },
    { num: LAP_EVENT_TYPE, type: "enum" },
    { num: LAP.startTime, type: "uint32" },
    { num: LAP.totalElapsedTime, type: "uint32" },
    { num: LAP.totalTimerTime, type: "uint32" },
    { num: LAP.totalDistance, type: "uint32" },
    { num: LAP.avgHeartRate, type: "uint8" },
    { num: LAP.maxHeartRate, type: "uint8" },
    { num: LAP.avgCadence, type: "uint8" },
    { num: LAP.avgPower, type: "uint16" },
    { num: LAP.maxPower, type: "uint16" },
    { num: LAP_INTENSITY, type: "enum" },
  ]);
  rec.laps.forEach((lap, index) => {
    const lapTotals = totals(slice(rec, lap.from, lap.to));
    writer.write(3, {
      253: at(lap.to),
      [MESSAGE_INDEX]: index,
      [LAP_EVENT]: EVENT_KIND.lap,
      [LAP_EVENT_TYPE]: EVENT_TYPE.stop,
      [LAP.startTime]: at(lap.from),
      [LAP.totalElapsedTime]: (lap.to - lap.from) * 1000,
      [LAP.totalTimerTime]: lapTotals.timerSeconds * 1000,
      [LAP.totalDistance]: scaled(lapTotals.distanceM, 100),
      [LAP.avgHeartRate]: lapTotals.avgHr,
      [LAP.maxHeartRate]: lapTotals.maxHr,
      [LAP.avgCadence]: whole(lapTotals.avgCadence, 0, 254),
      [LAP.avgPower]: lapTotals.avgPower,
      [LAP.maxPower]: lapTotals.maxPower,
      [LAP_INTENSITY]: INTENT_INTENSITY[lap.intent] ?? INTENSITY.active,
    });
  });

  writer
    .define(4, MESG.session, [
      { num: 253, type: "uint32" },
      { num: MESSAGE_INDEX, type: "uint16" },
      { num: EVENT.event, type: "enum" },
      { num: EVENT.eventType, type: "enum" },
      { num: SESSION.startTime, type: "uint32" },
      { num: SESSION.sport, type: "enum" },
      { num: SESSION.subSport, type: "enum" },
      { num: SESSION.totalElapsedTime, type: "uint32" },
      { num: SESSION.totalTimerTime, type: "uint32" },
      { num: SESSION.totalDistance, type: "uint32" },
      { num: SESSION.totalAscent, type: "uint16" },
      { num: SESSION.avgHeartRate, type: "uint8" },
      { num: SESSION.maxHeartRate, type: "uint8" },
      { num: SESSION.avgCadence, type: "uint8" },
      { num: SESSION.avgPower, type: "uint16" },
      { num: SESSION.maxPower, type: "uint16" },
      { num: SESSION_FIRST_LAP, type: "uint16" },
      { num: SESSION_NUM_LAPS, type: "uint16" },
    ])
    .write(4, {
      253: at(end),
      [MESSAGE_INDEX]: 0,
      [EVENT.event]: EVENT_KIND.session,
      [EVENT.eventType]: EVENT_TYPE.stop,
      [SESSION.startTime]: at(0),
      [SESSION.sport]: SPORT.cycling,
      [SESSION.subSport]: SUB_SPORT.indoorCycling,
      [SESSION.totalElapsedTime]: end * 1000,
      [SESSION.totalTimerTime]: sum.timerSeconds * 1000,
      [SESSION.totalDistance]: scaled(sum.distanceM, 100),
      [SESSION.totalAscent]: whole(sum.ascentM, 0, 65534),
      [SESSION.avgHeartRate]: sum.avgHr,
      [SESSION.maxHeartRate]: sum.maxHr,
      [SESSION.avgCadence]: whole(sum.avgCadence, 0, 254),
      [SESSION.avgPower]: sum.avgPower,
      [SESSION.maxPower]: sum.maxPower,
      [SESSION_FIRST_LAP]: 0,
      [SESSION_NUM_LAPS]: rec.laps.length,
    });

  const local = options.localOffsetSeconds;
  return writer
    .define(5, MESG.activity, [
      { num: 253, type: "uint32" },
      { num: ACTIVITY.totalTimerTime, type: "uint32" },
      { num: ACTIVITY.numSessions, type: "uint16" },
      { num: ACTIVITY_TYPE, type: "enum" },
      { num: ACTIVITY_EVENT, type: "enum" },
      { num: ACTIVITY_EVENT_TYPE, type: "enum" },
      { num: ACTIVITY.localTimestamp, type: "uint32" },
    ])
    .write(5, {
      253: at(end),
      [ACTIVITY.totalTimerTime]: sum.timerSeconds * 1000,
      [ACTIVITY.numSessions]: 1,
      [ACTIVITY_TYPE]: 0,
      [ACTIVITY_EVENT]: EVENT_KIND.activity,
      [ACTIVITY_EVENT_TYPE]: EVENT_TYPE.stop,
      [ACTIVITY.localTimestamp]: local === undefined ? null : at(end) + Math.round(local),
    })
    .finish();
}

/** The part of a recording from second `from` up to `to`, for a lap's own totals. */
function slice(rec: Recording, from: number, to: number): Recording {
  const keep = rec.t.map((t) => t >= from && t < to);
  const pick = <T>(values: T[]) => values.filter((_, i) => keep[i]);
  return {
    ...rec,
    t: pick(rec.t).map((t) => t - from),
    power: pick(rec.power),
    cadence: pick(rec.cadence),
    hr: pick(rec.hr),
    speed: pick(rec.speed),
    distance: pick(rec.distance),
    altitude: pick(rec.altitude),
    laps: [],
    pauses: rec.pauses
      .filter((p) => p.from < to && (p.to ?? to) > from)
      .map((p) => ({ from: Math.max(p.from, from) - from, to: Math.min(p.to ?? to, to) - from })),
    endedAt: to - from,
  };
}

function whole(value: number | null | undefined, min: number, max: number): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function scaled(value: number | null | undefined, scale: number): number | null {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value * scale);
}
