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
 * A made-up ride as a real FIT file, for the demo: a 72 km loop through
 * rolling Danish country with five hills, the head unit's automatic lap
 * every 10 km, a sprint for a town sign, a coffee stop, power, pulse that
 * lags and drifts as pulse does, and cadence. It goes through the same
 * decoder and import as a rider's own file, so the demo's activity page
 * shows what an upload really gives. Deterministic: every demo gets the
 * same ride.
 */

const TOTAL_M = 72_000;
const LAP_M = 10_000;
/** Somewhere west of Vejle; the loop is invented, the roads are not real. */
const CENTRE = { lat: 55.72, lon: 9.45 };
const HILLS = [
  { at: 8_000, length: 1_500, gain: 85 },
  { at: 23_000, length: 700, gain: 40 },
  { at: 37_000, length: 1_200, gain: 70 },
  { at: 52_000, length: 900, gain: 45 },
  { at: 63_000, length: 500, gain: 22 },
];
const SPRINT_AT_M = 30_000;
const STOP_AT_M = 45_000;
const STOP_SECONDS = 18 * 60;

function altitude(m: number): number {
  let alt = 25;
  for (const h of HILLS) {
    const down = h.length * 0.8;
    if (m >= h.at && m < h.at + h.length) alt += ((m - h.at) / h.length) * h.gain;
    else if (m >= h.at + h.length && m < h.at + h.length + down)
      alt += h.gain * (1 - (m - h.at - h.length) / down);
  }
  return alt;
}

function position(m: number): { lat: number; lon: number } {
  const u = (m / TOTAL_M) * 2 * Math.PI;
  return {
    lat: CENTRE.lat + 0.1 * Math.sin(u) + 0.012 * Math.sin(5 * u),
    lon: CENTRE.lon + 0.17 * Math.cos(u) + 0.02 * Math.cos(3 * u),
  };
}

function noise(seed: number) {
  let x = seed;
  return (spread: number) => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return (x / 2147483648 - 0.5) * 2 * spread;
  };
}

type Sample = {
  s: number;
  m: number;
  alt: number;
  speed: number;
  power: number;
  hr: number;
  cadence: number;
};

function simulate(): Sample[] {
  const jitter = noise(11);
  const samples: Sample[] = [];
  let m = 0;
  let s = 0;
  let hr = 95;
  let stopped = false;
  let sprint = 0;
  while (m < TOTAL_M) {
    if (!stopped && m >= STOP_AT_M) {
      stopped = true;
      s += STOP_SECONDS;
      hr = 100;
    }
    if (sprint === 0 && m >= SPRINT_AT_M) sprint = 12;
    const grade = (altitude(m + 10) - altitude(m)) / 10;
    let power: number;
    let speed: number;
    if (sprint > 0) {
      power = 720 + jitter(60);
      speed = 14 + jitter(0.5);
      sprint = sprint === 1 ? -1 : sprint - 1;
    } else if (grade > 0.02) {
      power = 275 + jitter(25);
      speed = Math.max(4.5, 9.5 - 70 * grade) + jitter(0.3);
    } else if (grade < -0.02) {
      power = jitter(1) > 0.2 ? 0 : 70 + jitter(20);
      speed = Math.min(15, 9.5 - 70 * grade) + jitter(0.3);
    } else {
      power = 185 + jitter(35);
      speed = 9.3 + jitter(0.5);
    }
    power = Math.max(0, Math.round(power));
    const target = Math.min(188, 95 + 0.28 * power + (s / 3600) * 4);
    hr += (target - hr) / 25 + jitter(0.6);
    samples.push({
      s,
      m,
      alt: altitude(m),
      speed,
      power,
      hr: Math.round(hr),
      cadence:
        power === 0 ? 0 : Math.round((grade > 0.02 ? 80 : sprint > 0 ? 105 : 90) + jitter(4)),
    });
    m += speed;
    s += 1;
  }
  return samples;
}

/** The ride as FIT bytes, starting at `startMs`. */
export function sampleRideFit(startMs: number): Uint8Array {
  const samples = simulate();
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
  for (const x of samples) {
    const p = position(x.m);
    writer.write(1, {
      253: at(x.s),
      [RECORD.positionLat]: semicircles(p.lat),
      [RECORD.positionLong]: semicircles(p.lon),
      [RECORD.heartRate]: x.hr,
      [RECORD.cadence]: x.cadence,
      [RECORD.distance]: Math.round(x.m * 100),
      [RECORD.power]: x.power,
      [RECORD.enhancedSpeed]: Math.round(x.speed * 1000),
      [RECORD.enhancedAltitude]: Math.round((x.alt + 500) * 5),
    });
  }

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
    const boundary = Math.floor(x.m / LAP_M) > Math.floor(lapStart.m / LAP_M);
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
