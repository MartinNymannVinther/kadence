import type { Range } from "./energy";
import {
  allowedLossKg,
  carbsPerHour,
  MAX_CARBS_PER_HOUR,
  UNTRAINED_CAP,
  type CarbAdvice,
} from "./fuel";
import type { BottleMl } from "./fuel-items";
import { referenceKg, type RiderClass } from "./reference-rider";
import type { Sex } from "./energy";

/**
 * The day a plan is for: a race or a training session, how long and how
 * hot, the rider's class and sex, and what comes next. From it the goals
 * before, during and after (docs/research/ernaering.md, 1.4–1.5 and 4).
 *
 * Kadence stays with the windows around the session and never says what a
 * young rider should eat in a whole day (ADR 0047): what comes next moves
 * the meals just after the session and the plate for the evening, not a
 * daily total.
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

export type Session = "race" | "training";
export type Intensity = "easy" | "tempo" | "intervals";
/** Rest or an easy day tomorrow; a hard session or a race tomorrow; another hard session within 8 hours. */
export type Next = "rest" | "hard" | "soon";

export type Day = {
  session: Session;
  intensity: Intensity;
  minutes: number;
  celsius: number;
  gutTrained: boolean;
  bottleMl: BottleMl;
  riderClass: RiderClass;
  sex: Sex;
  next: Next;
  /** When the race or session starts, in minutes since midnight; null to leave the clock out. */
  startMin: number | null;
};

export const DEFAULT_DAY: Day = {
  session: "race",
  intensity: "tempo",
  minutes: 120,
  celsius: 18,
  gutTrained: false,
  bottleMl: 750,
  riderClass: "U17",
  sex: "male",
  next: "rest",
  startMin: 10 * 60,
};

export const gutCapFor = (gutTrained: boolean) => (gutTrained ? MAX_CARBS_PER_HOUR : UNTRAINED_CAP);

/**
 * Carbohydrate an hour on the bike. A race, and training at tempo or in
 * intervals, follow the race's table (Team Danmark: 30–60 g/h "ved høj
 * intensitet" over an hour). An easy ride is lower: Jeukendrup 2014 has
 * "up to 30 g/h" for 1–2 hours and "up to 60 g/h" for 2–3 hours for
 * trained athletes, to be adjusted downwards when the absolute intensity
 * is low — so 0–30 g/h up to two hours and 30–60 g/h beyond. Kadence's
 * reading.
 */
export function carbAdvice(day: Day): CarbAdvice {
  const hours = day.minutes / 60;
  const race = carbsPerHour(hours, day.gutTrained);
  if (day.session === "race" || day.intensity !== "easy") return race;
  if (race.kind === "water" || race.kind === "small") return race;
  const low = hours <= 2 ? 0 : 30;
  const high = hours <= 2 ? 30 : Math.min(60, gutCapFor(day.gutTrained));
  return { low, high, target: Math.round((low + high) / 2 / 5) * 5, kind: "single", capped: false };
}

/** A race, or training that is not easy. */
export const hardToday = (day: Day) => day.session === "race" || day.intensity !== "easy";

/**
 * Sweat an hour: 0.7–1.2 l in Danish weather, up to 2 l in heat at high
 * intensity (Team Danmark). From 25 °C Kadence reads it as 1.2–2 l.
 */
export function sweatPerHour(celsius: number): Range {
  return celsius < 25 ? { low: 0.7, high: 1.2 } : { low: 1.2, high: 2 };
}

/** The gut takes up about 1–1.5 l an hour (Team Danmark). */
export const ABSORB_FLUID: Range = { low: 1, high: 1.5 };

const times = (range: Range, by: number): Range => ({ low: range.low * by, high: range.high * by });

/** The main meal comes 3–4 hours before the start (Team Danmark); the goal is read from 3. */
export const MEAL_HOURS = 3;

/**
 * Before the start: 1–4 g/kg of carbohydrate 1–4 hours before (Thomas
 * 2016), read as about 1 g/kg for each hour from the main meal to the
 * start, give or take half a gram — the main meal 3–4 hours before and a
 * snack 1–2 hours before together (Team Danmark). And 5–10 ml/kg to drink
 * in the last hours (Thomas 2016).
 */
export function beforeTargets(day: Day): { carbs: Range; fluid: Range } {
  const kg = referenceKg(day.riderClass, day.sex);
  const perKg = { low: MEAL_HOURS - 0.5, high: MEAL_HOURS + 0.5 };
  return {
    carbs: { low: Math.round(perKg.low * kg), high: Math.round(perKg.high * kg) },
    fluid: times({ low: 0.005, high: 0.01 }, kg),
  };
}

export type AfterSlot = { carbs: Range; protein: Range | null; fluid: Range };

/**
 * After: 1–1.2 g/kg of carbohydrate and 0.25–0.3 g/kg of protein straight
 * away, and ½–1 l to drink (Team Danmark; Thomas 2016). With another hard
 * session within 8 hours the carbohydrate is repeated every hour for the
 * first four hours (Thomas 2016), with 0.5–0.7 l an hour to drink (Team
 * Danmark).
 */
export function afterSlots(day: Day): AfterSlot[] {
  const kg = referenceKg(day.riderClass, day.sex);
  const carbs = { low: Math.round(kg * 1), high: Math.round(kg * 1.2) };
  const protein = { low: Math.round(kg * 0.25), high: Math.round(kg * 0.3) };
  const first: AfterSlot = { carbs, protein, fluid: { low: 0.5, high: 1 } };
  if (day.next !== "soon") return [first];
  const later: AfterSlot = { carbs, protein: null, fluid: { low: 0.5, high: 0.7 } };
  return [first, later, later, later];
}

/**
 * The plate for the meal 1–2 hours after (Team Danmark): the "Elite"
 * plate — half carbohydrate, a quarter protein, a quarter vegetables — on
 * days with 1½ hours of hard training or more, Fødevarestyrelsen's
 * Y-plate on others. Kadence also gives the Elite plate when a hard day
 * follows, so the stores are full for it.
 */
export function plateFor(day: Day): "elite" | "everyday" {
  if (day.next !== "rest") return "elite";
  return hardToday(day) && day.minutes >= 90 ? "elite" : "everyday";
}

/**
 * Sweat the rider may lose before it costs performance, in litres: 2 % of
 * the reference weight below 25 °C, 1 % above 30 °C (Team Danmark).
 */
export function allowedLossL(day: Day): number {
  return allowedLossKg(referenceKg(day.riderClass, day.sex), day.celsius);
}

/** The sweat not drunk back during the session, and the 125–150 % of it to drink after (Thomas 2016). */
export function fluidAfter(day: Day, drunkL: number): { lossL: Range; replaceL: Range } {
  const sweat = times(sweatPerHour(day.celsius), day.minutes / 60);
  const lossL = { low: Math.max(0, sweat.low - drunkL), high: Math.max(0, sweat.high - drunkL) };
  return { lossL, replaceL: { low: lossL.low * 1.25, high: lossL.high * 1.5 } };
}
