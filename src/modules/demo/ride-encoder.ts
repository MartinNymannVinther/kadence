import {
  FILE_ID,
  FILE_TYPE,
  FitWriter,
  LAP,
  MESG,
  msToFitTime,
  RECORD,
  SESSION,
  SPORT,
} from "@/modules/fit";

/**
 * Made-up rides written as real FIT files, for the demo: one record a
 * second with position, height, pulse, cadence, distance, speed and watt,
 * a lap every `lapEveryM`, and a session with the totals. Goes through the
 * same decoder and import as a rider's own file.
 */

export type RideSample = {
  s: number;
  m: number;
  alt: number;
  speed: number;
  power: number;
  hr: number;
  cadence: number;
  lat: number;
  lon: number;
};

export function encodeRide(samples: readonly RideSample[], startMs: number, lapEveryM: number) {
  const at = (s: number) => msToFitTime(startMs + s * 1000);
  const semicircles = (deg: number) => Math.round((deg * 2 ** 31) / 180);
  const writer = new FitWriter()
    .define(0, MESG.fileId, [
      { num: FILE_ID.type, type: "enum" },
      { num: FILE_ID.manufacturer, type: "uint16" },
      { num: FILE_ID.timeCreated, type: "uint32" },
    ])
    .write(0, {
      [FILE_ID.type]: FILE_TYPE.activity,
      [FILE_ID.manufacturer]: 255,
      [FILE_ID.timeCreated]: at(0),
    })
    .define(1, MESG.record, [
      { num: 253, type: "uint32" },
      { num: RECORD.positionLat, type: "sint32" },
      { num: RECORD.positionLong, type: "sint32" },
      { num: RECORD.heartRate, type: "uint8" },
      { num: RECORD.cadence, type: "uint8" },
      { num: RECORD.distance, type: "uint32" },
      { num: RECORD.power, type: "uint16" },
      { num: RECORD.enhancedSpeed, type: "uint32" },
      { num: RECORD.enhancedAltitude, type: "uint32" },
    ]);
  for (const x of samples)
    writer.write(1, {
      253: at(x.s),
      [RECORD.positionLat]: semicircles(x.lat),
      [RECORD.positionLong]: semicircles(x.lon),
      [RECORD.heartRate]: x.hr,
      [RECORD.cadence]: x.cadence,
      [RECORD.distance]: Math.round(x.m * 100),
      [RECORD.power]: x.power,
      [RECORD.enhancedSpeed]: Math.round(x.speed * 1000),
      [RECORD.enhancedAltitude]: Math.round((x.alt + 500) * 5),
    });

  writer.define(2, MESG.lap, [
    { num: 253, type: "uint32" },
    { num: LAP.startTime, type: "uint32" },
    { num: LAP.totalElapsedTime, type: "uint32" },
    { num: LAP.totalDistance, type: "uint32" },
  ]);
  const last = samples.at(-1)!;
  let lapStart = samples[0]!;
  for (let i = 1; i < samples.length; i++) {
    const x = samples[i]!;
    const boundary = Math.floor(x.m / lapEveryM) > Math.floor(lapStart.m / lapEveryM);
    if (!boundary && x !== last) continue;
    const end = x === last ? x.s + 1 : x.s;
    writer.write(2, {
      253: at(end),
      [LAP.startTime]: at(lapStart.s),
      [LAP.totalElapsedTime]: (end - lapStart.s) * 1000,
      [LAP.totalDistance]: Math.round((x.m - lapStart.m) * 100),
    });
    lapStart = x;
  }

  return writer
    .define(3, MESG.session, [
      { num: 253, type: "uint32" },
      { num: SESSION.startTime, type: "uint32" },
      { num: SESSION.sport, type: "enum" },
      { num: SESSION.totalElapsedTime, type: "uint32" },
      { num: SESSION.totalDistance, type: "uint32" },
    ])
    .write(3, {
      253: at(last.s + 1),
      [SESSION.startTime]: at(0),
      [SESSION.sport]: SPORT.cycling,
      [SESSION.totalElapsedTime]: (last.s + 1) * 1000,
      [SESSION.totalDistance]: Math.round(last.m * 100),
    })
    .finish();
}

/** A small deterministic generator, so every demo tells the same story. */
export function noise(seed: number) {
  let x = seed;
  return (spread: number) => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return (x / 2147483648 - 0.5) * 2 * spread;
  };
}
