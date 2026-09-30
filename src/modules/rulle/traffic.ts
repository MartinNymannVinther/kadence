import { hash } from "./hash";
import { riseOver, visitsOnLap } from "./happenings";
import type { Course } from "./route/course";

/**
 * Other riders on the road (ADR 0035): life, not competition. Now and
 * then someone comes the other way, often with a hand raised in greeting;
 * someone slower rides ahead and is caught; someone faster comes from
 * behind and passes on the left; sometimes a few together, a club out
 * riding. Once in a while, at the roadside, someone mending a puncture,
 * the bike upside down. No names, no numbers, no gaps: nobody is raced.
 *
 * Where each is met is fixed by the route and the lap, like the small
 * things (ADR 0034), and they keep clear of those: nothing oncoming where
 * a car overtakes. Pure.
 */

export type RiderKind = "oncoming" | "ahead" | "behind";

export type Rider = {
  kind: RiderKind;
  /** Metres along the lap where the rider is met. */
  at: number;
  /** One, or a few together. */
  count: number;
  /** Metres a second of their own; `ahead` is slower than a steady rider, `behind` faster. */
  speed: number;
  /** Whether the oncoming raise a hand. */
  greets: boolean;
  /** Picks their jerseys. */
  seed: number;
};

export type Puncture = { at: number };

/** Metres between the places someone may be met: about one a minute and a half at a steady pace. */
const SPACING = 850;
const QUIET = 0.25;
/** Nothing oncoming this close to a car or a scooter overtaking, nor to a lap's start and end. */
const CLEAR = 250;
const START = 150;

export function ridersOnLap(course: Course, lap: number): Rider[] {
  const seed = Math.round(course.length) + 5;
  const busy = visitsOnLap(course, lap).filter((v) => v.kind === "car" || v.kind === "scooter");
  const riders: Rider[] = [];
  const offset = hash(lap, seed, 101) * SPACING;
  for (let k = 0; offset + k * SPACING < course.length; k++) {
    const at = offset + k * SPACING + (hash(lap, k, seed + 102) - 0.5) * 0.5 * SPACING;
    if (at < START || at > course.length - START) continue;
    if (hash(lap, k, seed + 103) < QUIET) continue;
    const roll = hash(lap, k, seed + 104);
    const kind: RiderKind = roll < 0.5 ? "oncoming" : roll < 0.8 ? "ahead" : "behind";
    if (kind === "oncoming" && busy.some((v) => Math.abs(v.at - at) < CLEAR)) continue;
    const size = hash(lap, k, seed + 105);
    const count = size < 0.62 ? 1 : size < 0.84 ? 2 : size < 0.95 ? 3 : 4;
    const pace = hash(lap, k, seed + 106);
    riders.push({
      kind,
      at,
      count,
      speed:
        kind === "ahead" ? 4.8 + pace * 1.6 : kind === "behind" ? 11 + pace * 2.5 : 7 + pace * 3,
      greets: hash(lap, k, seed + 107) < 0.55,
      seed: Math.floor(hash(lap, k, seed + 108) * 1e6),
    });
  }
  return riders;
}

/** Someone mending a puncture: on about one lap in three, on a flat stretch. */
export function punctureOnLap(course: Course, lap: number): Puncture | null {
  const seed = Math.round(course.length) + 6;
  if (hash(lap, seed, 111) > 0.34) return null;
  for (let tries = 0; tries < 8; tries++) {
    const at = START + hash(lap, tries, seed + 112) * (course.length - 2 * START);
    if (Math.abs(riseOver(course, at - 50, 100)) < 0.02) return { at };
  }
  return null;
}
