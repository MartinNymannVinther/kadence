import { z } from "zod";

/**
 * A ride as Rulle records it: one sample a second while the rider rides,
 * a lap for every block, and the pauses between. Kept as columns — a
 * number per second per channel — so a two-hour ride is a few hundred
 * kilobytes of JSON and can be put aside in the browser every few seconds,
 * where a closed tab or a crash cannot take it (`ride-store` in the
 * components). The FIT file is written from this (`ride-fit.ts`).
 *
 * Times are whole seconds since `startedAt`. The functions change the
 * recording they are given, in place: it lives in one ref for as long as
 * the ride does. Pure otherwise — no browser, no clock of its own.
 */

const channel = z.array(z.number().nullable());

export const recordingSchema = z.object({
  startedAt: z.number().int().positive(),
  t: z.array(z.number().int().min(0)),
  power: channel,
  cadence: channel,
  hr: channel,
  /** m/s along the course, from the physics. */
  speed: channel,
  /** Metres along the course since the start. */
  distance: channel,
  altitude: channel,
  laps: z.array(
    z.object({ from: z.number().int().min(0), to: z.number().int().min(0), intent: z.string() }),
  ),
  pauses: z.array(
    z.object({ from: z.number().int().min(0), to: z.number().int().min(0).nullable() }),
  ),
  endedAt: z.number().int().min(0).nullable(),
});

export type Recording = z.infer<typeof recordingSchema>;

export type Reading = {
  power: number | null;
  cadence: number | null;
  hr: number | null;
  speed: number | null;
  distance: number | null;
  altitude: number | null;
};

const CHANNELS = ["power", "cadence", "hr", "speed", "distance", "altitude"] as const;

export function startRecording(nowMs: number): Recording {
  return {
    startedAt: Math.floor(nowMs / 1000) * 1000,
    t: [],
    power: [],
    cadence: [],
    hr: [],
    speed: [],
    distance: [],
    altitude: [],
    laps: [],
    pauses: [],
    endedAt: null,
  };
}

const secondOf = (rec: Recording, nowMs: number) =>
  Math.max(0, Math.floor((nowMs - rec.startedAt) / 1000));

/** The reading for the second `nowMs` falls in; a second already recorded takes the newer values. */
export function record(rec: Recording, nowMs: number, reading: Reading): void {
  if (rec.endedAt !== null) return;
  const second = secondOf(rec, nowMs);
  const last = rec.t.at(-1);
  if (last !== undefined && second < last) return;
  if (last === second) {
    for (const key of CHANNELS) {
      const value = finite(reading[key]);
      if (value !== null) rec[key][rec[key].length - 1] = value;
    }
    return;
  }
  rec.t.push(second);
  for (const key of CHANNELS) rec[key].push(finite(reading[key]));
}

export function pauseRecording(rec: Recording, nowMs: number): void {
  if (rec.endedAt !== null || rec.pauses.at(-1)?.to === null) return;
  rec.pauses.push({ from: secondOf(rec, nowMs), to: null });
}

export function resumeRecording(rec: Recording, nowMs: number): void {
  const open = rec.pauses.at(-1);
  if (open && open.to === null) open.to = Math.max(open.from, secondOf(rec, nowMs));
}

/** Ends the lap that is running at `nowMs`: the block it belonged to had `intent`. */
export function closeLap(rec: Recording, nowMs: number, intent: string): void {
  const from = rec.laps.at(-1)?.to ?? 0;
  const to = secondOf(rec, nowMs);
  if (to > from) rec.laps.push({ from, to, intent });
}

export function endRecording(rec: Recording, nowMs: number, intent: string): void {
  if (rec.endedAt !== null) return;
  resumeRecording(rec, nowMs);
  closeLap(rec, nowMs, intent);
  rec.endedAt = Math.max(secondOf(rec, nowMs), (rec.t.at(-1) ?? 0) + 1);
}

export type RideTotals = {
  /** Seconds from start to end, pauses included. */
  elapsedSeconds: number;
  /** Seconds ridden: the elapsed ones less the pauses. */
  timerSeconds: number;
  distanceM: number | null;
  ascentM: number | null;
  avgPower: number | null;
  maxPower: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgCadence: number | null;
  workKj: number | null;
  /** Anything a sensor measured: without it, there is no ride to write, only a session to tick off. */
  measured: boolean;
};

export function totals(rec: Recording): RideTotals {
  const elapsed = rec.endedAt ?? (rec.t.at(-1) ?? 0) + 1;
  const paused = rec.pauses.reduce((s, p) => s + ((p.to ?? elapsed) - p.from), 0);
  const power = present(rec.power);
  const hr = present(rec.hr);
  const cadence = present(rec.cadence).filter((c) => c > 0);
  const distance = present(rec.distance);
  let ascent = 0;
  const alt = present(rec.altitude);
  for (let i = 1; i < alt.length; i++) ascent += Math.max(0, alt[i]! - alt[i - 1]!);
  const sum = (values: number[]) => values.reduce((s, v) => s + v, 0);
  const mean = (values: number[]) =>
    values.length > 0 ? Math.round(sum(values) / values.length) : null;
  const max = (values: number[]) =>
    values.length > 0 ? values.reduce((a, b) => Math.max(a, b)) : null;
  return {
    elapsedSeconds: elapsed,
    timerSeconds: Math.max(0, elapsed - paused),
    distanceM: distance.length > 1 ? Math.round(distance.at(-1)! - distance[0]!) : null,
    ascentM: alt.length > 1 ? Math.round(ascent) : null,
    avgPower: mean(power),
    maxPower: max(power),
    avgHr: mean(hr),
    maxHr: max(hr),
    avgCadence: mean(cadence),
    workKj: power.length > 0 ? Math.round(sum(power) / 100) / 10 : null,
    measured: power.length > 0 || hr.length > 0 || cadence.length > 0,
  };
}

/** A recording put aside earlier, if it still reads as one. */
export function readRecording(value: unknown): Recording | null {
  const parsed = recordingSchema.safeParse(value);
  if (!parsed.success) return null;
  const rec = parsed.data;
  const n = rec.t.length;
  return CHANNELS.every((key) => rec[key].length === n) ? rec : null;
}

function finite(value: number | null): number | null {
  return value !== null && Number.isFinite(value) ? value : null;
}

function present(values: (number | null)[]): number[] {
  return values.filter((v): v is number => v !== null);
}
