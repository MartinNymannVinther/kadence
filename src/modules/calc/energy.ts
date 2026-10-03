/**
 * How much energy a race takes, four ways, most certain first. Every
 * formula and number is in docs/research/ernaering.md, section 4.3, with
 * its source; the calculator shows a range, never one confident number,
 * because none of the four is better than that.
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

export type Range = { low: number; high: number };

/** Mechanical work from average power, zeros included: kJ = W × s / 1000. */
export function workKj(avgWatts: number, seconds: number): number {
  return (avgWatts * seconds) / 1000;
}

/**
 * Gross efficiency in cycling is 18–23 % (Hopker et al. 2009, after
 * Coyle 1992): kcal = kJ / (GE × 4.184), so each kJ of work costs
 * 1.04–1.33 kcal. The rule of thumb "kJ ≈ kcal" holds at about 24 %.
 * No data were found for 15–18-year-olds.
 */
export const GROSS_EFFICIENCY: Range = { low: 0.18, high: 0.23 };
const KJ_PER_KCAL = 4.184;

export function kcalFromWork(kj: number): Range {
  return {
    low: kj / (GROSS_EFFICIENCY.high * KJ_PER_KCAL),
    high: kj / (GROSS_EFFICIENCY.low * KJ_PER_KCAL),
  };
}

export type Position = "hoods" | "drops" | "timeTrial";

/**
 * Drag area by position, from one professional rider in a wind tunnel
 * (Defraeye et al. 2010). Smaller riders are probably lower; no figures
 * for young riders were found.
 */
export const CDA: Record<Position, number> = { hoods: 0.27, drops: 0.243, timeTrial: 0.211 };

/** Rolling resistance and drivetrain efficiency (Martin et al. 1998). */
export const CRR = 0.0032;
export const DRIVETRAIN = 0.976;
const G = 9.81;

/** Air density at sea level from the ideal gas law, kg/m³. */
export function airDensity(celsius: number): number {
  return 101325 / (287.05 * (273.15 + celsius));
}

/**
 * Average power from speed alone, by the standard cycling power equation
 * without wind (Martin et al. 1998). Only for a time trial or a ride on
 * one's own: in a bunch the shelter moves between 5 and 95 % of the air
 * resistance (Blocken et al. 2018), and no average for a whole race exists.
 */
export function powerFromSpeed(input: {
  kmh: number;
  totalKg: number;
  climbM: number;
  seconds: number;
  position: Position;
  celsius: number;
}): number {
  const v = input.kmh / 3.6;
  const air = 0.5 * airDensity(input.celsius) * CDA[input.position] * v ** 3;
  const rolling = CRR * input.totalKg * G * v;
  const climbing = input.seconds > 0 ? (input.totalKg * G * input.climbM) / input.seconds : 0;
  return (air + rolling + climbing) / DRIVETRAIN;
}

export type Sex = "female" | "male";

/**
 * Energy from heart rate (Keytel et al. 2005, the model without VO2max),
 * in kcal. Built on 18–45-year-olds riding steadily; the calculator says
 * so for anyone younger, and for races with intervals and sprints.
 */
export function kcalFromHeartRate(input: {
  bpm: number;
  kg: number;
  age: number;
  sex: Sex;
  minutes: number;
}): number {
  const { bpm, kg, age } = input;
  const kjPerMin =
    input.sex === "male"
      ? -55.0969 + 0.6309 * bpm + 0.1988 * kg + 0.2017 * age
      : -20.4022 + 0.4472 * bpm - 0.1263 * kg + 0.074 * age;
  return Math.max(0, (kjPerMin * input.minutes) / KJ_PER_KCAL);
}

export const HEART_RATE_VALID_AGES: Range = { low: 18, high: 45 };

export type RaceKind = "fast" | "racing" | "solo";

/**
 * MET values from the 2024 Adult Compendium of Physical Activities:
 * 01040 fast riding 22.5–25.6 km/h (10.0), 01050 racing in general
 * (12.0), 01060 racing above 32 km/h without shelter (16.8). The roughest
 * of the four ways: kcal ≈ MET × kg × hours.
 */
export const MET: Record<RaceKind, number> = { fast: 10, racing: 12, solo: 16.8 };

export function kcalFromMet(kind: RaceKind, kg: number, hours: number): number {
  return MET[kind] * kg * hours;
}

/** A single estimate is widened to ±15 %, so no method looks surer than it is. */
export const ESTIMATE_SPREAD = 0.15;

export function spread(kcal: number): Range {
  return { low: kcal * (1 - ESTIMATE_SPREAD), high: kcal * (1 + ESTIMATE_SPREAD) };
}
