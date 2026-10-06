import { lanesFor } from "./fuel-check";

/**
 * The day's windows on the clock, from the time the race or session
 * starts: the main meal 3–4 hours before and the snack 1–2 hours before
 * (Team Danmark), each hour on the bike, straight after (the first half
 * hour), the four hours after when another hard session follows within
 * 8 hours, and the main meal 1–2 hours after. Times are minutes since
 * midnight and wrap past it.
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

export type Window = { from: number; to: number };

export type DayTimes = {
  mainMeal: Window;
  snack: Window;
  ride: Window;
  lanes: Window[];
  recovery: Window;
  refuel: Window;
  dinner: Window;
  /**
   * The main meal would come before 6 o'clock: then Team Danmark's advice
   * for a morning session — a small breakfast, and sports drink on the
   * way — fits better. The hour is Kadence's line.
   */
  early: boolean;
};

export const DEFAULT_START = 10 * 60;
const DAY = 24 * 60;
const EARLY = 6 * 60;

export const wrap = (minutes: number) => ((minutes % DAY) + DAY) % DAY;

const window = (from: number, to: number): Window => ({ from: wrap(from), to: wrap(to) });

export function dayTimes(start: number, minutes: number): DayTimes {
  const lanes = lanesFor(minutes);
  const finish = start + (lanes.at(-1)?.toMin ?? minutes);
  const mealFrom = start - 4 * 60;
  return {
    mainMeal: window(mealFrom, start - 3 * 60),
    snack: window(start - 2 * 60, start - 60),
    ride: window(start, finish),
    lanes: lanes.map((lane) => window(start + lane.fromMin, start + lane.toMin)),
    recovery: window(finish, finish + 30),
    refuel: window(finish, finish + 4 * 60),
    dinner: window(finish + 60, finish + 120),
    early: wrap(mealFrom) < EARLY,
  };
}
