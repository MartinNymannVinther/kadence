import { hash } from "./hash";
import { courseAt, type Course } from "./route/course";

/**
 * The small things on the way (ADR 0034). Once in a while something
 * passes: an electric cargo bike, whose motor stops helping at 25 km/h
 * and which so only overtakes where the road climbs; a car that washes
 * its windscreen as it goes by; a youngster on an electric scooter in a
 * full-face helmet, far too fast; a farm dog that runs along for a bit.
 * By the road there are cows, and flags that always blow against the
 * rider; on the steepest climb, the rider's name in chalk and someone
 * with a cowbell.
 *
 * Where each happens is fixed by the route and the lap: the same ride
 * meets the same things, and a lap later something else. Rare on
 * purpose, a few a lap: the landscape is the background, and these are
 * for the corner of the eye. Pure.
 */

export type VisitorKind = "cargo" | "car" | "scooter" | "dog";

/** Something that passes, and where on the lap it begins. */
export type Visit = { kind: VisitorKind; at: number };

/** Metres a second. */
export const VISITOR_SPEED = {
  /** An electric bike's motor helps up to 25 km/h and no further (EU Regulation 168/2013, art. 2(2)(h)). */
  cargo: 25 / 3.6,
  /** Fifty, on a scooter allowed twenty in Denmark. */
  scooter: 50 / 3.6,
  /** A car on a country road, a good deal faster than a bike. */
  car: 72 / 3.6,
} as const;

/** Metres between the places where something may happen: every few minutes at a steady pace. */
const SPACING = 3800;
/** The share of those places where nothing happens after all. */
const QUIET = 0.3;
/** Rising at least this over the next 200 m is climbing: where the cargo bike overtakes. */
const CLIMBING = 0.035;
/** Nothing else happens this close before the chalk climb or the cargo bike's climb. */
const CLEAR = 600;
/** Metres at the least between two things that pass. */
const APART = 1200;
/** At most this many a lap, the cargo bike's climb besides. */
const MOST = 4;
/** Nothing happens right at the start of a lap. */
const START = 250;

export type Climb = { from: number; to: number; grade: number };

/** How much the road rises over the `metres` after `at`, as a fraction. */
export function riseOver(course: Course, at: number, metres: number): number {
  return (courseAt(course, at + metres).ele - courseAt(course, at).ele) / metres;
}

/** Whether `at` lies within `from`–`to` on a lap of `length`, the lap's end joined to its start. */
function within(at: number, from: number, to: number, length: number): boolean {
  return [at, at + length, at - length].some((x) => x >= from && x <= to);
}

/** The route's steepest climb of `length` metres, if it rises at least `min`; `avoid` is left out. */
export function steepestClimb(
  course: Course,
  length: number,
  min: number,
  avoid: { from: number; to: number } | null = null,
): Climb | null {
  let best: Climb | null = null;
  for (let at = 0; at < course.length; at += 25) {
    if (avoid && within(at, avoid.from - length, avoid.to, course.length)) continue;
    const grade = riseOver(course, at, length);
    if (grade >= min && (!best || grade > best.grade)) best = { from: at, to: at + length, grade };
  }
  return best;
}

/** The steepest climb, where the road has words in chalk and someone rings a cowbell. */
export type Chalk = Climb & {
  /** Where the rider's name is written, where "almost there" is, and where the cowbell is rung. */
  name: number;
  top: number;
  bell: number;
};

export function chalkOf(course: Course): Chalk | null {
  const climb = steepestClimb(course, 400, 0.05);
  if (!climb) return null;
  return { ...climb, name: climb.from + 70, top: climb.to - 60, bell: climb.from + 170 };
}

/** What passes on lap `lap` (from 0), in the order it is met. */
export function visitsOnLap(course: Course, lap: number): Visit[] {
  const seed = Math.round(course.length);
  const chalk = chalkOf(course);
  const clear: [number, number][] = [];
  if (chalk) clear.push([chalk.from - CLEAR, chalk.to + CLEAR / 3]);
  const visits: Visit[] = [];
  // The cargo bike's own climb, well away from the chalk's: on the first
  // lap always, after that now and then. A route with no real climb but
  // the chalk's has it where the road rises a little.
  const theirs = chalk ? { from: chalk.from - CLEAR, to: chalk.to + CLEAR } : null;
  const climb =
    steepestClimb(course, 300, 0.04, theirs) ?? steepestClimb(course, 300, 0.025, theirs);
  if (climb && (lap === 0 || hash(lap, seed, 71) < 0.5)) {
    visits.push({ kind: "cargo", at: climb.from + 40 });
    // The rest of the hill is the cargo bike's too.
    clear.push([climb.from - CLEAR, climb.to + 2 * CLEAR]);
  }
  const near = (at: number) =>
    visits.some((v) => {
      const d = Math.abs(v.at - at) % course.length;
      return Math.min(d, course.length - d) < APART;
    });
  // The first lap shows early on that things happen: the scooter, in its
  // hurry, on the first flat stretch after a kilometre and a half or so.
  if (lap === 0 && course.length > 6000)
    for (let at = 1500 + hash(seed, 0, 76) * 1000; at < 4500; at += 250) {
      if (clear.some(([from, to]) => within(at, from, to, course.length)) || near(at)) continue;
      if (riseOver(course, at, 200) >= CLIMBING) continue;
      visits.push({ kind: "scooter", at });
      break;
    }
  const offset = hash(lap, seed, 72) * SPACING;
  let previous: VisitorKind | null =
    lap === 0 && visits.some((v) => v.kind === "scooter") ? "scooter" : null;
  let placed = 0;
  for (let k = 0; offset + k * SPACING < course.length && placed < MOST; k++) {
    const at = offset + k * SPACING + (hash(lap, k, seed + 73) - 0.5) * 0.4 * SPACING;
    if (at < START || at > course.length - START) continue;
    if (clear.some(([from, to]) => within(at, from, to, course.length))) continue;
    if (near(at) || hash(lap, k, seed + 74) < QUIET) continue;
    const others = (["car", "scooter", "dog"] as const).filter((kind) => kind !== previous);
    const kind: VisitorKind =
      riseOver(course, at, 200) >= CLIMBING
        ? "cargo"
        : others[Math.floor(hash(lap, k, seed + 75) * others.length)]!;
    visits.push({ kind, at });
    previous = kind;
    placed += 1;
  }
  return visits.sort((a, b) => a.at - b.at);
}

/** A few cows in a fenced field beside the road. */
export type Herd = { at: number; side: 1 | -1; length: number; cows: number; red: boolean };

/** A flagpole beside the road; its flag always blows against the rider. */
export type Flag = { at: number; side: 1 | -1 };

/** Where the herds graze, the same on every lap. */
export function herdsOf(course: Course): Herd[] {
  const seed = Math.round(course.length) + 1;
  const chalk = chalkOf(course);
  const herds: Herd[] = [];
  for (let k = 0; (k + 0.5) * 4200 < course.length; k++) {
    const at = (k + 0.3 + hash(k, seed, 81) * 0.5) * 4200;
    if (at < START || at > course.length - START) continue;
    if (chalk && within(at, chalk.from - 200, chalk.to + 200, course.length)) continue;
    herds.push({
      at,
      side: hash(k, seed, 82) < 0.5 ? -1 : 1,
      length: 90 + hash(k, seed, 83) * 60,
      cows: 4 + Math.floor(hash(k, seed, 84) * 5),
      red: hash(k, seed, 85) < 0.35,
    });
  }
  return herds;
}

/** Where the flags stand, the same on every lap: none by a herd or on the chalk climb. */
export function flagsOf(course: Course): Flag[] {
  const seed = Math.round(course.length) + 2;
  const chalk = chalkOf(course);
  const herds = herdsOf(course);
  const flags: Flag[] = [];
  for (let k = 0; (k + 0.5) * 5500 < course.length; k++) {
    const at = (k + 0.25 + hash(k, seed, 86) * 0.5) * 5500;
    if (at < START || at > course.length - START) continue;
    if (chalk && within(at, chalk.from - 150, chalk.to + 150, course.length)) continue;
    if (herds.some((h) => within(at, h.at - 200, h.at + h.length + 200, course.length))) continue;
    flags.push({ at, side: hash(k, seed, 87) < 0.75 ? 1 : -1 });
  }
  return flags;
}

/**
 * A pause, as the landscape shows it: a drink from the bottle with a foot
 * down; after a quarter of a minute a café or a stand by the road, and a
 * seat; after three minutes a second cup and the paper; after ten, asleep.
 */
export type PauseStage = "bottle" | "cafe" | "second" | "asleep";

export const PAUSE_AT = { cafe: 15, second: 180, asleep: 600 } as const;

export function pauseStage(seconds: number): PauseStage {
  if (seconds >= PAUSE_AT.asleep) return "asleep";
  if (seconds >= PAUSE_AT.second) return "second";
  return seconds >= PAUSE_AT.cafe ? "cafe" : "bottle";
}

/** A café with coffee, or a farm stand with a soda: the first stop of a ride is always the café. */
export type StopKind = "cafe" | "stand";

export function stopKind(pauseIndex: number): StopKind {
  if (pauseIndex === 0) return "cafe";
  return hash(pauseIndex, 0, 91) < 0.6 ? "cafe" : "stand";
}

/** Cups (or bottles) a pause of `seconds` comes to. */
export function drinksIn(seconds: number): number {
  if (seconds < PAUSE_AT.cafe) return 0;
  return seconds < PAUSE_AT.second ? 1 : 2;
}
