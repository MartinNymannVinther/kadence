import { timeTicks } from "@/components/charts/zoom";
import { clockText } from "@/components/training/duration";
import { hoursMinutes } from "./streams-data";

/**
 * The clock a window is printed in, and which ticks the time axis prints
 * under it — pure functions of the window and the plot's geometry, so
 * the one rule that gives the ticks, the printed ends, the status and
 * the selection's readout the same shape, and the rule that keeps a tick
 * clear of a printed end, are tested alone.
 */

/** A character of an axis label at text-2xs, tabular. Generous: a tick gives way rather than touches. */
export const CHAR_PX = 6.5;
/** Air between a tick label and a printed end. */
export const GAP_PX = 8;
/** From ten minutes a window's clock drops the seconds. */
export const COARSE_WINDOW_S = 600;

export type AxisTick = { seconds: number; text: string };

/**
 * A moment on the ride's clock, to the second: m:ss on a ride under an
 * hour and h:mm:ss through a ride of an hour or more — "0:44:55" rather
 * than "44:55", so it reads beside the total "2:30" and the h:mm ticks
 * instead of looking like a moment on another clock.
 */
export function momentText(seconds: number, total: number): string {
  const s = Math.round(seconds);
  const text = clockText(s);
  return total >= 3600 && s < 3600 ? `0:${text.padStart(5, "0")}` : text;
}

/**
 * The clock a window is printed in: h:mm once the window is ten minutes
 * or longer — a moment floored to the minute — and to the second below
 * that. The ticks, the printed ends, the status and the selection's
 * readout all say a moment through this one function, so an axis never
 * reads "50:00 0:51 0:52 … 55:05".
 */
export function clockStamp(
  domain: readonly [number, number],
  total: number,
): (seconds: number) => string {
  const coarse = domain[1] - domain[0] >= COARSE_WINDOW_S;
  return (seconds) => (coarse ? hoursMinutes(seconds) : momentText(seconds, total));
}

/** Ticks per 90 px of plot, three at least, eight at most. */
export const wantedTicks = (plotWidth: number) =>
  Math.max(3, Math.min(8, Math.floor(plotWidth / 90)));

/** The width a label takes on the axis, from its text. */
export const labelWidth = (text: string) => text.length * CHAR_PX;

/**
 * The ticks under a plot: the clock's own steps, printed in the window's
 * clock (`stamp`). With a window's ends printed at the plot's edges, a
 * tick gives way when its label would touch an end's — the ends and the
 * ticks can be h:mm:ss, so the room is taken from the text, not a
 * constant — or when it would say the same thing: the ends are floored
 * to the minute, so a tick seconds before one otherwise prints twice.
 */
export function axisTicks(
  domain: readonly [number, number],
  plot: readonly [number, number],
  x: (seconds: number) => number,
  stamp: (seconds: number) => string,
  ends: readonly [string, string] | null,
): AxisTick[] {
  const ticks = timeTicks(domain[0], domain[1], wantedTicks(plot[1] - plot[0])).map((seconds) => ({
    seconds,
    text: stamp(seconds),
  }));
  if (!ends) return ticks;
  const left = plot[0] + labelWidth(ends[0]) + GAP_PX;
  const right = plot[1] - labelWidth(ends[1]) - GAP_PX;
  return ticks.filter(({ seconds, text }) => {
    if (text === ends[0] || text === ends[1]) return false;
    const half = labelWidth(text) / 2;
    return x(seconds) - half >= left && x(seconds) + half <= right;
  });
}
