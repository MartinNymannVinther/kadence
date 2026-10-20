import type { Range } from "./energy";

/**
 * Carbohydrate and fluid an hour on the bike. The numbers are
 * docs/research/ernaering.md, sections 4.4–4.5, each with its source; the
 * few that are Kadence's own reading are marked so here and on the page.
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

export type CarbKind = "water" | "small" | "single" | "multiple";

export type CarbAdvice = Range & { target: number; kind: CarbKind; capped: boolean };

/**
 * Without practice the gut takes about 60 g an hour, which one kind of
 * sugar covers (Jeukendrup 2014; Team Danmark: 60–90 g/h "kræver en vis
 * tilvænning"). Kadence's rule, approved 3 October 2026: 60 g/h unless
 * the rider has practised more in training — for U17 too, where no
 * source gives a figure for teenagers.
 */
export const UNTRAINED_CAP = 60;

/** More than 90 g an hour is never suggested to young riders (docs/research/ernaering.md, 4.4). */
export const MAX_CARBS_PER_HOUR = 90;

/**
 * Carbohydrate per hour by the race's length (Thomas et al. 2016;
 * Jeukendrup 2014; Team Danmark): under 45 min water; up to 75 min small
 * amounts or a mouth rinse; up to 2.5 h 30–60 g/h; longer 60–90 g/h of
 * glucose and fructose together. More than 90 g/h is never suggested to
 * young riders.
 */
export function carbsPerHour(hours: number, gutTrained: boolean): CarbAdvice {
  if (hours < 0.75) return { low: 0, high: 0, target: 0, kind: "water", capped: false };
  if (hours < 1.25) return { low: 0, high: 0, target: 0, kind: "small", capped: false };
  const base: Range = hours <= 2.5 ? { low: 30, high: 60 } : { low: 60, high: MAX_CARBS_PER_HOUR };
  const capped = !gutTrained && base.high > UNTRAINED_CAP;
  const high = capped ? UNTRAINED_CAP : base.high;
  const low = Math.min(base.low, high);
  const target = Math.round((low + high) / 2 / 5) * 5;
  return { low, high, target, kind: high > 60 ? "multiple" : "single", capped };
}

/**
 * Fluid per hour without a measured sweat rate (Team Danmark): 0.4–0.8 L
 * below 25 °C, 0.8–1.2 L from 25 °C. Never more than the sweat lost
 * (Thomas et al. 2016).
 */
export function fluidPerHour(celsius: number): Range {
  return celsius < 25 ? { low: 0.4, high: 0.8 } : { low: 0.8, high: 1.2 };
}
