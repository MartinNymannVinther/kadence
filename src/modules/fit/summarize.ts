import { ascentFromAltitude } from "./ascent";
import { SPORT, SUB_SPORT } from "./profile";
import { buildTimeline, type Timeline } from "./timeline";
import type { FitFile, FitSession } from "./types";

/**
 * What a ride was, from its FIT file: when it started, how long it took and
 * how much of that was riding, how far and how high, the averages, the
 * work, and the one-second power and heart rate the load model and the
 * zones are computed from elsewhere (this file computes neither).
 *
 * Everything but the device's own totals comes from the one-second
 * timeline (`timeline.ts`), which says what a pause and a moving second are:
 *
 * - `elapsedSeconds`: the sessions' total elapsed time when the device
 *   wrote one, else the timeline's length.
 * - `movingSeconds`: seconds going faster than 0.5 m/s, pedalling or
 *   producing power; pauses longer than five seconds are not moving.
 * - `distanceM`: the sessions' total, else the records' own distance, else
 *   the speed summed over the seconds.
 * - `ascentM`: the sessions' total ascent, else climbed from the smoothed
 *   altitude with a small hysteresis (`ascent.ts`).
 * - `avgPower`, `avgHr`: over the seconds that have a value, zeros
 *   included for power (coasting is part of the ride). `avgCadence` leaves
 *   zeros out: it is how fast the rider pedals when pedalling.
 * - `workKj`: power summed over the seconds, joules to kilojoules.
 * - `streams`: every channel thinned to one value per `STREAM_SECONDS`, the
 *   average of the window, for charts; `t` is seconds since `startedAt`.
 *
 * `startedAt` is the time of the first record, second 0 of `power1hz` and
 * `hr1hz`.
 */

export const STREAM_SECONDS = 5;

type Channel = (number | null)[];

export interface ActivityStreams {
  t: number[];
  power: Channel;
  hr: Channel;
  cadence: Channel;
  speed: Channel;
  alt: Channel;
}

export interface ActivitySummary {
  startedAt: Date;
  sport: "bike" | "other";
  movingSeconds: number;
  elapsedSeconds: number;
  distanceM?: number;
  ascentM?: number;
  avgPower?: number;
  maxPower?: number;
  avgHr?: number;
  maxHr?: number;
  avgCadence?: number;
  workKj?: number;
  power1hz: Channel;
  hr1hz: Channel;
  streams: ActivityStreams;
}

/**
 * FIT sport 2 (cycling) is a bike ride, and so is sub-sport 6 (indoor
 * cycling), which some trainers file under fitness equipment. Everything
 * else — running, skiing, a gym session — is "other".
 */
export function activitySport(fit: Pick<FitFile, "sport" | "subSport">): "bike" | "other" {
  return fit.sport === SPORT.cycling || fit.subSport === SUB_SPORT.indoorCycling ? "bike" : "other";
}

/** Throws `FitError("empty")` when the file has no timestamped record. */
export function summarizeActivity(fit: FitFile): ActivitySummary {
  const line = buildTimeline(fit.records);
  const power = stats(line.power);
  const hr = stats(line.hr);
  const cadence = stats(line.cadence.map((c) => (c === 0 ? null : c)));

  return {
    startedAt: new Date(line.startMs),
    sport: activitySport(fit),
    movingSeconds: line.moving.reduce((n, moving) => n + (moving ? 1 : 0), 0),
    elapsedSeconds: Math.round(sessionTotal(fit.sessions, "elapsedSeconds") ?? line.moving.length),
    distanceM: rounded(sessionTotal(fit.sessions, "distanceM") ?? recordedDistance(line), 0),
    ascentM: rounded(sessionTotal(fit.sessions, "ascentM") ?? ascentFromAltitude(line.alt), 0),
    avgPower: rounded(power.avg, 0),
    maxPower: power.max,
    avgHr: rounded(hr.avg, 0),
    maxHr: hr.max,
    avgCadence: rounded(cadence.avg, 0),
    workKj: power.count > 0 ? round(power.sum / 1000, 1) : undefined,
    power1hz: line.power,
    hr1hz: line.hr,
    streams: {
      t: Array.from(
        { length: Math.ceil(line.moving.length / STREAM_SECONDS) },
        (_, i) => i * STREAM_SECONDS,
      ),
      power: thin(line.power, 0),
      hr: thin(line.hr, 0),
      cadence: thin(line.cadence, 0),
      speed: thin(line.speed, 2),
      alt: thin(line.alt, 1),
    },
  };
}

/** The sessions' sum of a total, when at least one session has it above zero. */
function sessionTotal(
  sessions: readonly FitSession[],
  key: "elapsedSeconds" | "distanceM" | "ascentM",
): number | undefined {
  const values = sessions.map((s) => s[key]).filter((v): v is number => v !== undefined);
  const sum = values.reduce((a, b) => a + b, 0);
  return values.length > 0 && sum > 0 ? sum : undefined;
}

/** The records' own distance from first to last, else speed summed over the seconds. */
function recordedDistance(line: Timeline): number | undefined {
  const known = line.distance.filter((d): d is number => d !== null);
  const first = known[0];
  const last = known.at(-1);
  if (first !== undefined && last !== undefined && last > first) return last - first;
  const fromSpeed = stats(line.speed).sum;
  return fromSpeed > 0 ? fromSpeed : undefined;
}

function stats(values: Channel): { avg?: number; max?: number; sum: number; count: number } {
  let sum = 0;
  let count = 0;
  let max: number | undefined;
  for (const value of values) {
    if (value === null) continue;
    sum += value;
    count++;
    if (max === undefined || value > max) max = value;
  }
  return { avg: count > 0 ? sum / count : undefined, max, sum, count };
}

/** Channel averaged over windows of `STREAM_SECONDS`; null where a window has no value. */
function thin(values: Channel, digits: number): Channel {
  const out: Channel = [];
  for (let start = 0; start < values.length; start += STREAM_SECONDS) {
    const window = values.slice(start, start + STREAM_SECONDS);
    const { avg } = stats(window);
    out.push(avg === undefined ? null : round(avg, digits));
  }
  return out;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function rounded(value: number | undefined, digits: number): number | undefined {
  return value === undefined ? undefined : round(value, digits);
}
