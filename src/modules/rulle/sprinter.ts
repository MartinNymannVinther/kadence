import { PHYSICS, resistance } from "./physics";

/**
 * The sprinter (ADR 0050), called by HYLDTOFT: a small rider, 52 kg, who
 * sits on the rider's wheel for as long as his legs let him, sprints at
 * 1300 W from 200 metres out if he has anything left, and throws his
 * bike at the line with a jump. Here what he can ride and what following
 * costs him; the race itself is the challenger's (`ride/race.ts`). Pure:
 * nothing from the browser or the database.
 */

/** An effort ridden flat out: watts held for seconds. */
export type Effort = { watts: number; seconds: number };

/** What he can ride, as told: 600 W for a minute, and 360 W for five. */
const EFFORTS: readonly [Effort, Effort] = [
  { watts: 600, seconds: 60 },
  { watts: 360, seconds: 300 },
];

/**
 * The critical power model (Monod & Scherrer, Ergonomics 1965): watts
 * held for `seconds` are CP + W′/seconds — what can be ridden for as long
 * as one likes, and a reserve of work above it. Two efforts fix both.
 */
export function criticalPower(a: Effort, b: Effort): { cp: number; wPrime: number } {
  const wPrime = (a.watts - b.watts) / (1 / a.seconds - 1 / b.seconds);
  return { cp: a.watts - wPrime / a.seconds, wPrime };
}

const { cp, wPrime } = criticalPower(...EFFORTS);
const RIDER_KG = 52;

export const SPRINTER = {
  /** He and his bike, kg. */
  massKg: RIDER_KG + PHYSICS.bikeKg,
  /** 300 W for as long as he likes, and 18 kJ above it: from his two efforts. */
  cp,
  wPrime,
  /**
   * The share of the air he pushes against the rider the physics is for,
   * 70 kg: for a body of the same shape the area goes as the mass to the
   * two thirds — about 0.82.
   */
  air: Math.pow(RIDER_KG / (PHYSICS.massKg - PHYSICS.bikeKg), 2 / 3),
  /** Metres behind the rider he rides, middle to middle: his front wheel just off their back one. */
  wheel: 2,
  /** He sprints from this far out, metres, at these watts — the most he ever rides. */
  sprintFrom: 200,
  sprintWatts: 1300,
  /** He throws his bike from this far out, metres, and jumps this high at the top of it. */
  throwFrom: 15,
  jump: 0.7,
  /** How big he is drawn beside the rider: smaller still than his weight says (0.9), as asked. */
  scale: 0.85,
} as const;

/**
 * His reserve of work above CP after `seconds` at `watts`, from `reserve`
 * joules: spent at the watts above CP; below it won back the faster the
 * emptier it is, as in the differential W′ balance model (Skiba et al.,
 * Eur J Appl Physiol 2015). Never above full, never below empty.
 */
export function reserveAfter(reserve: number, watts: number, seconds: number): number {
  const next =
    watts > cp
      ? reserve - (watts - cp) * seconds
      : reserve + ((cp - watts) * seconds * (wPrime - reserve)) / wPrime;
  return Math.max(0, Math.min(wPrime, next));
}

/**
 * The watts that take `massKg` from `from` to `to` m/s in `seconds` on
 * `grade`, pushing a `drag` share of the air: `nextSpeed` turned round.
 * Never less than nothing: to go slower he freewheels.
 */
export function wattsFor(
  from: number,
  to: number,
  seconds: number,
  grade: number,
  massKg: number,
  drag: number,
): number {
  const v = Math.max(PHYSICS.minDriveSpeed, (from + to) / 2);
  const force = (massKg * (to - from)) / seconds + resistance(v, grade, massKg, drag);
  return Math.max(0, force * v);
}

/** How high he is in the air with `left` metres to the line: up from the throw in an arc, down on the line. */
export function jumpAt(left: number): number {
  if (left >= SPRINTER.throwFrom || left <= 0) return 0;
  const u = 1 - left / SPRINTER.throwFrom;
  return SPRINTER.jump * 4 * u * (1 - u);
}
