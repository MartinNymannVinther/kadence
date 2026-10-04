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
 * are counted down; then he builds over ten seconds from the watts that
 * held that speed to 900 W, rides 460 W for a minute, 360 W from there,
 * and 800 W for the last 200 metres — at about 66 kg, 7 W/kg for the
 * minute — and sits on the rider's wheel when they attack. Behind another
 * rider either of them pushes less air (`draft`). Pure.
 */

export const CHALLENGE = {
  /** Metres between the stretches he may turn up in. */
  every: 10_000,
  /** The race, metres from the start. */
  length: 2000,
  /** Seconds counted down alongside before the start, and over which he builds to 900 W after it. */
  countdown: 10,
  build: 10,
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
  /** The most he pushes to stay on a wheel. */
  chaseWatts: 1100,
} as const;

/** Where he is for the landscape: on the road, how fast, and his legs; and the line. */
export type ChallengerAt = {
  distance: number;
  /** Where the race ends, metres ridden: the line across the road; null before the start. */
  finish: number | null;
  /** Metres right of the road's middle. */
  line: number;
  speed: number;
  cadence: number;
  /** Out of the saddle, as he is in the sprint. */
  standing: boolean;
};

/** A race to come: where it begins, in metres ridden, and whether up a climb. */
export type ChallengeStart = { at: number; hill: boolean };

/** Where the first climb begins between `from` and `to` metres, if one does. */
function climbBetween(course: Course, from: number, to: number): number | null {
  for (let at = from; at < to; at += 50) {
    const rise = courseAt(course, at + 200).ele - courseAt(course, at).ele;
    if (rise / 200 >= CHALLENGE.climbing) return at;
  }
  return null;
}

/** The race in stretch `k` of a ride on `course`, or null where he does not turn up. */
export function challengeIn(course: Course, k: number): ChallengeStart | null {
  const seed = Math.round(course.length);
  const from = k * CHALLENGE.every + CHALLENGE.margin;
  const to = (k + 1) * CHALLENGE.every - CHALLENGE.margin - CHALLENGE.length;
  const foot = climbBetween(course, from + CHALLENGE.beforeFoot, to);
  const roll = hash(k, 17, seed);
  if (foot !== null)
    return roll < CHALLENGE.hill ? { at: foot - CHALLENGE.beforeFoot, hill: true } : null;
  if (roll >= CHALLENGE.flat) return null;
  return { at: from + hash(k, 29, seed) * (to - from), hill: false };
}

/**
 * His watts, `seconds` after the start with `left` metres to go, having
 * started on `from` watts: built up to 900 W over ten seconds, then a
 * minute at 460 W, 360 W, and 800 W for the last 200 metres.
 */
export function challengerWatts(seconds: number, left: number, from = 0): number {
  if (left <= 200) return 800;
  if (seconds < CHALLENGE.build) return from + ((900 - from) * seconds) / CHALLENGE.build;
  if (seconds < CHALLENGE.build + 60) return 460;
  return 360;
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
