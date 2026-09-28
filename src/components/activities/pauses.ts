import type { Streams } from "./streams-chart";

/**
 * Pauses in a ride: a stretch of at least `MIN_PAUSE_SECONDS` standing
 * still — no speed to speak of, no power, no pedalling — or with nothing
 * recorded at all (the device paused). A traffic light counts, and so
 * does a head unit's auto-pause of a few seconds; hiding pauses hides
 * them all, so the curves run unbroken. Only a longer stop gets a symbol, from
 * `SYMBOL_MIN_SECONDS`: a soda for a short stop, a coffee from a quarter
 * of an hour, lunch from half an hour; a shorter one is just a stop.
 *
 * For the view only. Hiding pauses moves the curves together; it changes
 * no number. Best efforts and the power curve are computed on the ride's
 * real clock (src/modules/load/weighted-power.ts), where a paused second
 * counts as 0 W — so a coffee in the middle of a 20-minute test can only
 * lower its best 20 minutes, never raise it.
 *
 * Pure, so it is tested alone.
 */

export const MIN_PAUSE_SECONDS = 15;
export const SYMBOL_MIN_SECONDS = 5 * 60;
/** m/s, the timeline's own walking-pace line (src/modules/fit/timeline.ts). */
const STILL_SPEED = 0.5;

export type PauseKind = "stop" | "soda" | "coffee" | "lunch";
export type Pause = { start: number; end: number; seconds: number; kind: PauseKind };

export function pauseKind(seconds: number): PauseKind {
  if (seconds < SYMBOL_MIN_SECONDS) return "stop";
  return seconds >= 30 * 60 ? "lunch" : seconds >= 15 * 60 ? "coffee" : "soda";
}

/** Whether a pause of this kind is drawn with a symbol, on the curves and on the map. */
export const hasSymbol = (kind: PauseKind) => kind !== "stop";

const low = (v: number | null | undefined, limit: number) =>
  v === null || v === undefined || v <= limit;

export function findPauses(streams: Streams): Pause[] {
  const t = streams.t;
  const step = t.length > 1 ? t[1]! - t[0]! : 5;
  const hasSpeed = (streams.speed ?? []).some((v) => typeof v === "number");
  const still = (i: number) => {
    const nothing = [streams.power, streams.hr, streams.cadence, streams.speed].every(
      (channel) => channel?.[i] === null || channel?.[i] === undefined,
    );
    if (nothing) return true;
    return (
      hasSpeed &&
      low(streams.speed?.[i], STILL_SPEED) &&
      low(streams.power?.[i], 0) &&
      low(streams.cadence?.[i], 0)
    );
  };

  const pauses: Pause[] = [];
  let start = -1;
  for (let i = 0; i <= t.length; i++) {
    if (i < t.length && still(i)) {
      if (start < 0) start = i;
      continue;
    }
    if (start >= 0) {
      const end = i - 1;
      const seconds = t[end]! - t[start]! + step;
      // A ride that starts or ends standing still has not paused.
      if (seconds >= MIN_PAUSE_SECONDS && start > 0 && i < t.length)
        pauses.push({ start, end, seconds, kind: pauseKind(seconds) });
      start = -1;
    }
  }
  return pauses;
}

/**
 * The streams with the pauses taken out: every channel without the paused
 * samples, `t` counting on as if the clock had stopped, and `index` naming
 * each kept sample's place in the original — so the route can still show
 * where the rider was. `joins` are where each pause was, on the new clock.
 */
export function withoutPauses(
  streams: Streams,
  pauses: readonly Pause[],
): { streams: Streams; index: number[]; joins: Array<{ t: number; pause: Pause }> } {
  const paused = new Set<number>();
  for (const p of pauses) for (let i = p.start; i <= p.end; i++) paused.add(i);
  const index = streams.t.map((_, i) => i).filter((i) => !paused.has(i));
  const step = streams.t.length > 1 ? streams.t[1]! - streams.t[0]! : 5;
  const pick = <T>(channel: T[] | undefined) =>
    channel ? index.map((i) => channel[i]!) : undefined;
  const t = index.map((_, k) => k * step);
  const joins = pauses.map((pause) => {
    const k = index.findIndex((i) => i > pause.end);
    return { t: (k < 0 ? index.length : k) * step, pause };
  });
  return {
    streams: {
      t,
      power: pick(streams.power),
      hr: pick(streams.hr),
      cadence: pick(streams.cadence),
      speed: pick(streams.speed),
      alt: pick(streams.alt),
      lat: pick(streams.lat),
      lon: pick(streams.lon),
    },
    index,
    joins,
  };
}
