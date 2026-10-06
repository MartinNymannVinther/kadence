import type { Range } from "./energy";

/**
 * What to eat and drink before, during and after a race. The numbers are
 * docs/research/ernaering.md, sections 4.4–4.9, each with its source; the
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

/**
 * The weight a rider may lose in sweat before performance suffers: 2 %
 * below 25 °C, 1 % above 30 °C (Team Danmark). Between the two Kadence
 * draws a straight line, its own reading.
 */
export function allowedLossKg(kg: number, celsius: number): number {
  const share = celsius <= 25 ? 0.02 : celsius >= 30 ? 0.01 : 0.02 - ((celsius - 25) / 5) * 0.01;
  return kg * share;
}

/** Sodium 500–700 mg per litre drunk (Team Danmark; ACSM 460–690). */
export function sodiumPerHour(fluid: Range): Range {
  return { low: fluid.low * 500, high: fluid.high * 700 };
}

export type BottleMix = 0 | 60 | 80;

export type FuelPlan = {
  bottles: number;
  litres: number;
  carbsFromBottles: number;
  pieces: number;
  carbsTotal: number;
};

/**
 * Bottles for the fluid, the carbohydrate in them, and pieces (gel, rice
 * cake, bar) for the rest: n = ⌈fluid / bottle⌉, rest = total − bottles,
 * pieces = ⌈rest / grams per piece⌉.
 */
export function fuelPlan(input: {
  hours: number;
  carbsPerHour: number;
  fluidPerHour: number;
  bottleLitres: number;
  mixGramsPerLitre: BottleMix;
  gramsPerPiece: number;
}): FuelPlan {
  const litres = input.fluidPerHour * input.hours;
  const bottles = Math.max(0, Math.ceil(litres / input.bottleLitres - 1e-9));
  const carbsTotal = Math.round(input.carbsPerHour * input.hours);
  const carbsFromBottles = Math.round(bottles * input.bottleLitres * input.mixGramsPerLitre);
  const rest = Math.max(0, carbsTotal - carbsFromBottles);
  const pieces =
    input.gramsPerPiece > 0 ? Math.max(0, Math.ceil(rest / input.gramsPerPiece - 1e-9)) : 0;
  return { bottles, litres, carbsFromBottles, pieces, carbsTotal };
}

/**
 * Before the start: 1–4 g/kg eaten 1–4 hours before, and 5–10 ml/kg to
 * drink 2–4 hours before (Thomas et al. 2016). Kadence reads the range as
 * about 1 g/kg for each hour before the start.
 */
export function beforeRace(kg: number, hoursBefore: number): { carbs: number; fluidMl: Range } {
  const h = Math.min(4, Math.max(1, hoursBefore));
  return { carbs: Math.round(kg * h), fluidMl: { low: kg * 5, high: kg * 10 } };
}

/**
 * After: 1–1.2 g/kg of carbohydrate an hour for the first hours when the
 * next hard session is within 8 hours, 0.25–0.3 g/kg of protein, and
 * 1.25–1.5 L of fluid for every kilo lost (Thomas et al. 2016; Team
 * Danmark).
 */
export function afterRace(kg: number): { carbs: Range; protein: Range } {
  return {
    carbs: { low: kg * 1, high: kg * 1.2 },
    protein: { low: kg * 0.25, high: kg * 0.3 },
  };
}

/** How much of the hour's energy the carbohydrate covers; information, never a target. */
export function coverage(carbsPerHourG: number, kcalPerHour: Range): Range | null {
  if (kcalPerHour.high <= 0 || carbsPerHourG <= 0) return null;
  return {
    low: (carbsPerHourG * 4) / kcalPerHour.high,
    high: (carbsPerHourG * 4) / kcalPerHour.low,
  };
}
