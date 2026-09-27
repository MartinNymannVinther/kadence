import {
  FILE_ID,
  FitError,
  FILE_TYPE,
  FitWriter,
  MANUFACTURER,
  MESG,
  msToFitTime,
  RECORD,
  SESSION,
  SPORT,
  type FitFieldSpec,
  type FitValues,
} from "@/modules/fit";

/**
 * Rides built with Kadence's own FIT writer, for the decoder and the summary
 * to read back. Values are given in real units and scaled here the way the
 * FIT profile says, so a round trip tests both directions of every scale.
 */

export const START_MS = Date.UTC(2026, 8, 1, 7, 0, 0);

export interface RideSample {
  /** Seconds after START_MS. */
  s: number;
  power?: number | null;
  hr?: number | null;
  cadence?: number | null;
  speed?: number | null;
  distance?: number | null;
  altitude?: number | null;
  lat?: number | null;
  lon?: number | null;
}

export interface RideSession {
  sport?: number;
  subSport?: number;
  elapsedSeconds?: number;
  timerSeconds?: number;
  distanceM?: number;
  ascentM?: number;
}

export const RECORD_FIELDS: FitFieldSpec[] = [
  { num: 253, type: "uint32" },
  { num: RECORD.positionLat, type: "sint32" },
  { num: RECORD.positionLong, type: "sint32" },
  { num: RECORD.heartRate, type: "uint8" },
  { num: RECORD.cadence, type: "uint8" },
  { num: RECORD.distance, type: "uint32" },
  { num: RECORD.power, type: "uint16" },
  { num: RECORD.enhancedSpeed, type: "uint32" },
  { num: RECORD.enhancedAltitude, type: "uint32" },
];

const scale = (value: number | null | undefined, factor: number, offset = 0) =>
  value === null || value === undefined ? null : Math.round((value + offset) * factor);

export const toSemicircles = (deg: number | null | undefined) =>
  deg === null || deg === undefined ? null : Math.round((deg * 2 ** 31) / 180);

export function recordValues(sample: RideSample): FitValues {
  return {
    253: msToFitTime(START_MS + sample.s * 1000),
    [RECORD.positionLat]: toSemicircles(sample.lat),
    [RECORD.positionLong]: toSemicircles(sample.lon),
    [RECORD.heartRate]: sample.hr,
    [RECORD.cadence]: sample.cadence,
    [RECORD.distance]: scale(sample.distance, 100),
    [RECORD.power]: sample.power,
    [RECORD.enhancedSpeed]: scale(sample.speed, 1000),
    [RECORD.enhancedAltitude]: scale(sample.altitude, 5, 500),
  };
}

export function writeFileId(writer: FitWriter, type: number = FILE_TYPE.activity): FitWriter {
  return writer
    .define(0, MESG.fileId, [
      { num: FILE_ID.type, type: "enum" },
      { num: FILE_ID.manufacturer, type: "uint16" },
      { num: FILE_ID.product, type: "uint16" },
      { num: FILE_ID.serialNumber, type: "uint32z" },
      { num: FILE_ID.timeCreated, type: "uint32" },
    ])
    .write(0, {
      [FILE_ID.type]: type,
      [FILE_ID.manufacturer]: MANUFACTURER.garmin,
      [FILE_ID.product]: 3121,
      [FILE_ID.serialNumber]: 123456789,
      [FILE_ID.timeCreated]: msToFitTime(START_MS),
    });
}

export function writeSession(writer: FitWriter, session: RideSession, endS: number): FitWriter {
  return writer
    .define(3, MESG.session, [
      { num: 253, type: "uint32" },
      { num: SESSION.startTime, type: "uint32" },
      { num: SESSION.sport, type: "enum" },
      { num: SESSION.subSport, type: "enum" },
      { num: SESSION.totalElapsedTime, type: "uint32" },
      { num: SESSION.totalTimerTime, type: "uint32" },
      { num: SESSION.totalDistance, type: "uint32" },
      { num: SESSION.totalAscent, type: "uint16" },
    ])
    .write(3, {
      253: msToFitTime(START_MS + endS * 1000),
      [SESSION.startTime]: msToFitTime(START_MS),
      [SESSION.sport]: session.sport ?? SPORT.cycling,
      [SESSION.subSport]: session.subSport,
      [SESSION.totalElapsedTime]: scale(session.elapsedSeconds, 1000),
      [SESSION.totalTimerTime]: scale(session.timerSeconds, 1000),
      [SESSION.totalDistance]: scale(session.distanceM, 100),
      [SESSION.totalAscent]: session.ascentM,
    });
}

/** file_id, a record per sample, and a session when given. */
export function encodeRide(samples: readonly RideSample[], session?: RideSession): Uint8Array {
  const writer = writeFileId(new FitWriter()).define(1, MESG.record, RECORD_FIELDS);
  for (const sample of samples) writer.write(1, recordValues(sample));
  if (session) writeSession(writer, session, samples.at(-1)?.s ?? 0);
  return writer.finish();
}

/** An hour at 200 W, 150 bpm, 90 rpm and 10 m/s, one record a second, 100 m up the road. */
export function steadyHour(): RideSample[] {
  return Array.from({ length: 3600 }, (_, s) => ({
    s,
    power: 200,
    hr: 150,
    cadence: 90,
    speed: 10,
    distance: s * 10,
    altitude: 100,
    lat: 55.6761 + s * 1e-5,
    lon: 12.5683,
  }));
}

/** The code of the FitError `fn` throws; undefined when it throws none. */
export function fitErrorCode(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    if (error instanceof FitError) return error.code;
    throw error;
  }
  return undefined;
}
