/**
 * What a race costs in energy, roughly, to set beside what the stomach can
 * take: the 2024 Adult Compendium of Physical Activities gives racing in
 * general (01050) 12 MET, so kcal ≈ 12 × kg × hours, widened to ±15 % so
 * one number does not look surer than it is (docs/research/ernaering.md,
 * 4.3.4). Kadence uses it for a race in a bunch only.
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

export type Range = { low: number; high: number };

export type Sex = "female" | "male";

/** Compendium 2024, 01050: bicycling, racing, general. */
export const RACING_MET = 12;

export function kcalRacing(kg: number, hours: number): number {
  return RACING_MET * kg * hours;
}

/** A single estimate is widened to ±15 %, so it does not look surer than it is. */
export const ESTIMATE_SPREAD = 0.15;

export function spread(kcal: number): Range {
  return { low: kcal * (1 - ESTIMATE_SPREAD), high: kcal * (1 + ESTIMATE_SPREAD) };
}
