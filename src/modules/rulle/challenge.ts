import { hash } from "./hash";
import { courseAt, type Course } from "./route/course";

/**
 * The challenger (ADR 0049): a rider in red and white who now and then
 * comes up beside the rider and races them for two kilometres. Every ten
 * kilometres or so there is a stretch he may turn up in: with a climb in
 * it, one time in five, at its foot, so the race goes up it; without, one
 * time in ten, somewhere along it. Where is fixed by the route and the
 * stretch: the same ride meets him in the same places.
 *
 * He comes up alongside and rides at the rider's speed while ten seconds
 * are counted down; then he rides his own watts whatever the rider does:
 * 800 W for the first 7 seconds and 460 W for the rest of the first
 * minute — about 7 W/kg at 66 kg — 380 W from there, and 800 W for the
 * last 200 metres. Behind another rider either of them pushes less air
 * (`draft`), so the one in the other's wheel goes faster on the same
 * watts. Pure.
 */

export const CHALLENGE = {
  /** Metres between the stretches he may turn up in. */
  every: 10_000,
  /** The race, metres from the start. */
  length: 2000,
  /** Seconds counted down alongside before the start. */
  countdown: 10,
  /** The chance he turns up in a stretch with a climb in it, and in one without. */
  hill: 0.2,
  flat: 0.1,
  /** Nothing in the first and the last metres of a stretch, so two races never meet. */
  margin: 1000,
  /** Rising at least this over 200 m is a climb, as for the cargo bike (`happenings.ts`). */
  climbing: 0.035,
  /** He comes up this far before a climb's foot. */
  beforeFoot: 150,
  /** He and his bike, kg: 460 W is about 7 W/kg. */
  massKg: 66 + 8,
  /** From these watts his hands are in the drops, in the saddle; over `standing`, he is out of it. */
  drops: 500,
  standing: 700,
} as const;

/**
 * How he rides: as the road has him; in the drops, in the saddle; out of
 * it, sprinting in them; or throwing his bike at the line (the sprinter's,
 * ADR 0050).
 */
export type ChallengerEffort = "steady" | "drops" | "sprint" | "throw";

/** Who races the rider: the challenger (ADR 0049), or the sprinter HYLDTOFT calls (ADR 0050). */
export type Rival = "challenger" | "sprinter";

/** Where he is for the landscape: on the road, how fast, and his legs; and the line. */
export type ChallengerAt = {
  distance: number;
  /** Where the race ends, metres ridden: the line across the road; null before the start. */
  finish: number | null;
  /** Metres right of the road's middle. */
  line: number;
  speed: number;
  cadence: number;
  /** How he rides for his watts (`challengerEffort`). */
  effort: ChallengerEffort;
  /** Metres he is up in the air: the sprinter's jump at the line. */
  jump: number;
  who: Rival;
};

/** A race to come: where it begins, in metres ridden, whether up a climb, and who rides it. */
export type ChallengeStart = { at: number; hill: boolean; who: Rival };

/** Where the first climb begins between `from` and `to` metres, if one does. */
function climbBetween(course: Course, from: number, to: number): number | null {
  for (let at = from; at < to; at += 50) {
    const rise = courseAt(course, at + 200).ele - courseAt(course, at).ele;
    if (rise / 200 >= CHALLENGE.climbing) return at;
  }
  return null;
}

/**
 * The race in stretch `k` of a ride on `course`, or null where nobody
 * turns up: the challenger or the sprinter (ADR 0050), half the time each.
 */
export function challengeIn(course: Course, k: number): ChallengeStart | null {
  const seed = Math.round(course.length);
  const from = k * CHALLENGE.every + CHALLENGE.margin;
  const to = (k + 1) * CHALLENGE.every - CHALLENGE.margin - CHALLENGE.length;
  const foot = climbBetween(course, from + CHALLENGE.beforeFoot, to);
  const roll = hash(k, 17, seed);
  // The two share the chance: which of them it is, half the time each.
  const who: Rival = hash(k, 37, seed) < 0.5 ? "challenger" : "sprinter";
  if (foot !== null)
    return roll < CHALLENGE.hill ? { at: foot - CHALLENGE.beforeFoot, hill: true, who } : null;
  if (roll >= CHALLENGE.flat) return null;
  return { at: from + hash(k, 29, seed) * (to - from), hill: false, who };
}

/**
 * His watts, `seconds` after the start with `left` metres to go: 800 W for
 * 7 seconds, 460 W to the end of the first minute, 380 W, and 800 W for
 * the last 200 metres. The same whatever the rider does.
 */
export function challengerWatts(seconds: number, left: number): number {
  if (left <= 200) return 800;
  if (seconds < 7) return 800;
  if (seconds < 60) return 460;
  return 380;
}

/**
 * How he rides on `watts`: from 500 W to 700 W in the drops, in the
 * saddle; over 700 W out of it, sprinting in them; below, as the road has
 * him.
 */
export function challengerEffort(watts: number): ChallengerEffort {
  if (watts > CHALLENGE.standing) return "sprint";
  if (watts >= CHALLENGE.drops) return "drops";
  return "steady";
}

/**
 * The share of the air a rider `behind` metres behind another still
 * pushes through: about two thirds a wheel's length back, all of it
 * alongside — wheels overlapping, less than half a metre — or eight
 * metres back.
 */
export function draft(behind: number): number {
  if (behind < 0.5 || behind >= 8) return 1;
  if (behind <= 3) return 0.67;
  return 0.67 + ((behind - 3) / 5) * 0.33;
}
