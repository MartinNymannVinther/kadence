import { FitError } from "./errors";
import type { FitRecord } from "./types";

/**
 * A ride on a one-second clock, the shape every number about it is
 * computed from: second 0 is the first record, and each channel is an
 * array with one value (or null) per second.
 *
 * - Records arrive in the file's order. One that goes back in time (a
 *   clock correction) is dropped; two in the same second merge, the later
 *   one's values winning.
 * - A record holds for the seconds until the next one when that comes
 *   within `MAX_HOLD_SECONDS` — devices that record every few seconds
 *   ("smart recording") still give a full timeline. A longer silence holds
 *   too when the rider kept going through it: up to `MAX_TRAVEL_GAP_SECONDS`
 *   apart, with the distance (or, without one, the position) advancing at
 *   least at `MOVING_SPEED` across it. A Garmin watch on smart recording
 *   writes a run every one to nine seconds; reading every silence over five
 *   seconds as a pause turned a 31-minute run into 20 minutes moving
 *   (14 October 2026). Any other silence is a pause: its seconds are null
 *   in every channel and not moving.
 * - Values no rider produces are sensor noise and become null before
 *   anything is summed (`PLAUSIBLE`), so one garbage sample of 65,000 W
 *   cannot dominate a week's load.
 * - A second is moving when the rider is going faster than walking pace
 *   (`MOVING_SPEED`), pedalling, or putting out power. A ride with none of
 *   those three channels — heart rate alone — is moving wherever there is a
 *   heart rate, since nothing says the rider stood still.
 *
 * A timeline longer than `MAX_TIMELINE_SECONDS` is refused rather than
 * allocated: no ride is that long, and a file claiming one is broken.
 */

export const MAX_HOLD_SECONDS = 5;
/** A longer silence still holds when the distance shows the rider kept going; beyond this it is a pause. */
export const MAX_TRAVEL_GAP_SECONDS = 60;
export const MAX_TIMELINE_SECONDS = 48 * 3600;
/** m/s, 1.8 km/h: below this a bike is standing still with a drifting GPS. */
export const MOVING_SPEED = 0.5;

export const PLAUSIBLE = {
  maxPower: 3000,
  minHr: 25,
  maxHr: 250,
  maxCadence: 250,
  /** m/s, 144 km/h. */
  maxSpeed: 40,
  minAltitude: -500,
  maxAltitude: 9000,
} as const;

type Channel = (number | null)[];

export interface Timeline {
  /** Epoch milliseconds of second 0. */
  startMs: number;
  power: Channel;
  hr: Channel;
  cadence: Channel;
  speed: Channel;
  alt: Channel;
  distance: Channel;
  /** Degrees; null where the device had no fix. */
  lat: Channel;
  lon: Channel;
  moving: boolean[];
}

interface Sample {
  power: number | null;
  hr: number | null;
  cadence: number | null;
  speed: number | null;
  alt: number | null;
  distance: number | null;
  lat: number | null;
  lon: number | null;
}

const CHANNELS = ["power", "hr", "cadence", "speed", "alt", "distance", "lat", "lon"] as const;

function within(value: number | undefined, min: number, max: number): number | null {
  return value !== undefined && Number.isFinite(value) && value >= min && value <= max
    ? value
    : null;
}

function clean(record: FitRecord): Sample {
  // 0°, 0° is in the Gulf of Guinea: a device without a fix that wrote
  // zeros rather than "no value".
  const fix = !(record.lat === 0 && record.lon === 0);
  return {
    power: within(record.power, 0, PLAUSIBLE.maxPower),
    hr: within(record.hr, PLAUSIBLE.minHr, PLAUSIBLE.maxHr),
    cadence: within(record.cadence, 0, PLAUSIBLE.maxCadence),
    speed: within(record.speed, 0, PLAUSIBLE.maxSpeed),
    alt: within(record.altitude, PLAUSIBLE.minAltitude, PLAUSIBLE.maxAltitude),
    distance: within(record.distance, 0, Number.MAX_SAFE_INTEGER),
    lat: fix ? within(record.lat, -90, 90) : null,
    lon: fix ? within(record.lon, -180, 180) : null,
  };
}

export function isMoving(sample: Sample): boolean {
  const { speed, power, cadence } = sample;
  if (speed === null && power === null && cadence === null) return sample.hr !== null;
  return (speed ?? 0) > MOVING_SPEED || (power ?? 0) > 0 || (cadence ?? 0) > 0;
}

const EARTH_RADIUS_M = 6_371_000;

/** Metres between two positions, by the haversine formula. */
function metresBetween(a: Sample, b: Sample): number | null {
  if (a.lat === null || a.lon === null || b.lat === null || b.lon === null) return null;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Whether the rider kept going through a silence of `gap` seconds between
 * two records: the device's distance advanced at least at walking pace,
 * or, without a distance, the position did.
 */
export function travelledThrough(from: Sample, to: Sample, gap: number): boolean {
  if (gap <= 0 || gap > MAX_TRAVEL_GAP_SECONDS) return false;
  const metres =
    from.distance !== null && to.distance !== null
      ? to.distance - from.distance
      : metresBetween(from, to);
  return metres !== null && metres / gap >= MOVING_SPEED;
}

export function buildTimeline(records: readonly FitRecord[]): Timeline {
  const seconds: number[] = [];
  const samples: Sample[] = [];
  let startMs: number | undefined;

  for (const record of records) {
    if (!Number.isFinite(record.t)) continue;
    startMs ??= Math.floor(record.t / 1000) * 1000;
    const second = Math.floor((record.t - startMs) / 1000);
    const last = seconds.at(-1);
    if (last !== undefined && second < last) continue;
    if (second >= MAX_TIMELINE_SECONDS)
      throw new FitError("too_large", `A ride longer than ${MAX_TIMELINE_SECONDS / 3600} hours.`);
    const sample = clean(record);
    const previous = samples.at(-1);
    if (last === second && previous) {
      for (const channel of CHANNELS) previous[channel] = sample[channel] ?? previous[channel];
    } else {
      seconds.push(second);
      samples.push(sample);
    }
  }
  if (startMs === undefined) throw new FitError("empty", "No record with a time.");

  const length = (seconds.at(-1) ?? 0) + 1;
  const timeline: Timeline = {
    startMs,
    power: new Array<number | null>(length).fill(null),
    hr: new Array<number | null>(length).fill(null),
    cadence: new Array<number | null>(length).fill(null),
    speed: new Array<number | null>(length).fill(null),
    alt: new Array<number | null>(length).fill(null),
    distance: new Array<number | null>(length).fill(null),
    lat: new Array<number | null>(length).fill(null),
    lon: new Array<number | null>(length).fill(null),
    moving: new Array<boolean>(length).fill(false),
  };

  samples.forEach((sample, i) => {
    const at = seconds[i] ?? 0;
    const next = seconds[i + 1] ?? at + 1;
    const following = samples[i + 1];
    const holds =
      next - at <= MAX_HOLD_SECONDS ||
      (following !== undefined && travelledThrough(sample, following, next - at));
    const until = holds ? next : at + 1;
    const moving = isMoving(sample);
    for (let s = at; s < until; s++) {
      for (const channel of CHANNELS) timeline[channel][s] = sample[channel];
      timeline.moving[s] = moving;
    }
  });
  return timeline;
}
