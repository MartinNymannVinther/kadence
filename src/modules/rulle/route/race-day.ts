import { hash } from "../hash";
import { courseAt, type Course } from "./course";
import type { CourseMark } from "./marks";

/**
 * Race day on a city's closed course (ADR 0036): where what a race brings
 * to its lap stands, laid out from the organiser's marks (`marks.ts`), the
 * land's cobbled streets and the road's own bends and climbs. The finish
 * straight barriered on both sides; an island with a marshal and a yellow
 * flag at every obstacle the organiser marks; a marshal at every sharp
 * bend, and barriers round the outside of the bends the organiser warns
 * of; the cobbles where the street is cobbled; the speed bumps; the feed
 * zone and the litter zone; the team buses where the teams park and the
 * podium where it stands. And how thick the crowd is anywhere: deep down
 * the finish straight, lining the climbs, a few together here and there
 * elsewhere. In metres along the lap. Pure.
 */

export type Side = 1 | -1;
/** From `from` to `to` metres along the lap; `from` may lie before the line (below 0). */
export type Stretch = { from: number; to: number };
export type Bend = { along: number; outside: Side; marked: boolean };
export type Spot = { along: number; side: Side; off: number };

export type RaceDay = {
  finish: Stretch;
  cobbles: Stretch[];
  islands: number[];
  bends: Bend[];
  bumps: number[];
  climbs: Stretch[];
  feed: (Stretch & { side: Side }) | null;
  litter: (Stretch & { side: Side }) | null;
  parking: Spot | null;
  podium: Spot | null;
};

export const RACE_DAY = {
  /** The finish straight: barriered from this far before the line to this far after it. */
  finishBefore: 250,
  finishAfter: 60,
  /** A bend this sharp (radians over `bendSpan` metres) has a marshal at it. */
  sharp: 0.8,
  bendSpan: 24,
  /** Bends closer than this are one. */
  bendApart: 50,
  /** Barriers round the outside of a marked bend, this far either side of it. */
  bendBarriers: 25,
  /** A cobbled street this close to the road, and running its way, is the road. */
  cobbleNear: 5,
  cobbleTurn: 0.5,
  /** Shorter than this, cobbles are a crossing; a gap shorter than `cobbleGap` is one stretch. */
  cobbleMin: 15,
  cobbleGap: 12,
  /** Cobbles the organiser marks and the land does not know, this long from the mark. */
  cobbleMarked: 80,
  bumpApart: 16,
  feedLength: 120,
  litterLength: 150,
  /** Steeper than this over `climbOver` metres is a climb, and lined with people. */
  climb: 0.05,
  climbOver: 40,
  climbMin: 60,
} as const;

type XY = { x: number; y: number };

/** Metres along the lap, from 0 up to its length. */
export const lapAlong = (along: number, length: number) => ((along % length) + length) % length;

export function inside(s: Stretch, along: number, length: number): boolean {
  return lapAlong(along - s.from, length) <= s.to - s.from;
}

/** Metres between two places on the lap, the short way round. */
export function lapGap(a: number, b: number, length: number): number {
  const d = lapAlong(a - b, length);
  return Math.min(d, length - d);
}

const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

export function raceDayOf(course: Course, setts: readonly XY[][] = []): RaceDay {
  const L = course.length;
  const R = RACE_DAY;
  const first = (kind: CourseMark["kind"]) => course.marks.find((m) => m.kind === kind) ?? null;
  const zone = (kind: "feed" | "litter", length: number) => {
    const m = first(kind);
    return m ? { from: m.along, to: m.along + length, side: m.side } : null;
  };
  const spot = (kind: "parking" | "podium"): Spot | null => {
    const m = first(kind);
    return m ? { along: m.along, side: m.side, off: m.off } : null;
  };
  return {
    finish: { from: -R.finishBefore, to: R.finishAfter },
    cobbles: cobblesOf(course, setts),
    islands: course.marks.filter((m) => m.kind === "obstacle").map((m) => m.along),
    bends: bendsOf(course),
    bumps: course.marks
      .filter((m) => m.kind === "bumps")
      .flatMap((m) => [m.along, lapAlong(m.along + R.bumpApart, L)]),
    climbs: climbsOf(course),
    feed: zone("feed", R.feedLength),
    litter: zone("litter", R.litterLength),
    parking: spot("parking"),
    podium: spot("podium"),
  };
}

/** How much the road turns about a place, radians over `bendSpan` metres: to the left positive. */
function turnAt(course: Course, along: number): number {
  const half = RACE_DAY.bendSpan / 2;
  return wrap(courseAt(course, along + half).heading - courseAt(course, along - half).heading);
}

/** The sharp bends, and those the organiser warns of, each once. */
function bendsOf(course: Course): Bend[] {
  const L = course.length;
  const found: Bend[] = [];
  for (let d = 0; d < L; d += 2) {
    const t = Math.abs(turnAt(course, d));
    if (t < RACE_DAY.sharp) continue;
    if (Math.abs(turnAt(course, d - 2)) > t || Math.abs(turnAt(course, d + 2)) >= t) continue;
    found.push({ along: d, outside: turnAt(course, d) > 0 ? 1 : -1, marked: false });
  }
  for (const m of course.marks.filter((k) => k.kind === "bend")) {
    const near = found
      .filter((b) => lapGap(b.along, m.along, L) < 40)
      .sort((a, b) => lapGap(a.along, m.along, L) - lapGap(b.along, m.along, L))[0];
    if (near) near.marked = true;
    else
      found.push({ along: m.along, outside: turnAt(course, m.along) > 0 ? 1 : -1, marked: true });
  }
  // One bend where two are close: the marked one, else the first.
  const kept: Bend[] = [];
  for (const b of found.sort((p, q) => Number(q.marked) - Number(p.marked))) {
    if (kept.every((k) => lapGap(k.along, b.along, L) >= RACE_DAY.bendApart)) kept.push(b);
  }
  return kept.sort((a, b) => a.along - b.along);
}

/** Where the road runs on the land's cobbled streets, and where the organiser says it does. */
function cobblesOf(course: Course, setts: readonly XY[][]): Stretch[] {
  const R = RACE_DAY;
  const n = course.x.length;
  const step = course.step;
  const on = (i: number) => {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    const heading = Math.atan2(course.y[b]! - course.y[a]!, course.x[b]! - course.x[a]!);
    const x = course.x[i]!;
    const y = course.y[i]!;
    for (const line of setts)
      for (let k = 0; k + 1 < line.length; k++) {
        const p = line[k]!;
        const q = line[k + 1]!;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const l2 = dx * dx + dy * dy || 1;
        const f = Math.max(0, Math.min(1, ((x - p.x) * dx + (y - p.y) * dy) / l2));
        if (Math.hypot(p.x + f * dx - x, p.y + f * dy - y) > R.cobbleNear) continue;
        // Either way along the street: what matters is that the road runs down it, not across.
        const across = Math.abs(wrap(2 * (Math.atan2(dy, dx) - heading))) / 2;
        if (across < R.cobbleTurn) return true;
      }
    return false;
  };
  const runs: Stretch[] = [];
  for (let i = 0; i < n; i++) {
    if (!on(i)) continue;
    const at = i * step;
    const last = runs.at(-1);
    if (last && at - last.to <= R.cobbleGap) last.to = at + step / 2;
    else runs.push({ from: at - step / 2, to: at + step / 2 });
  }
  const stretches = runs.filter((r) => r.to - r.from >= R.cobbleMin);
  for (const m of course.marks.filter((k) => k.kind === "cobbles"))
    if (
      !stretches.some((s) => inside({ from: s.from - 40, to: s.to + 40 }, m.along, course.length))
    )
      stretches.push({ from: m.along, to: m.along + R.cobbleMarked });
  return stretches.sort((a, b) => a.from - b.from);
}

/** The climbs: where the road rises by at least `climb` over `climbOver` metres, long enough to count. */
function climbsOf(course: Course): Stretch[] {
  const R = RACE_DAY;
  const out: Stretch[] = [];
  let from: number | null = null;
  for (let d = 0; d <= course.length; d += 10) {
    const rise = (courseAt(course, d + R.climbOver).ele - courseAt(course, d).ele) / R.climbOver;
    if (rise >= R.climb && from === null) from = d;
    if ((rise < R.climb || d + 10 > course.length) && from !== null) {
      if (d + R.climbOver - from >= R.climbMin) out.push({ from, to: d + R.climbOver });
      from = null;
    }
  }
  return out;
}

/** How many rows deep the crowd stands on a side of the road, and how full each row is. */
export type Crowd = { rows: number; fill: number };

const NOBODY: Crowd = { rows: 0, fill: 0 };

export function crowdAt(day: RaceDay, course: Course, along: number, side: Side): Crowd {
  const L = course.length;
  if (inside(day.finish, along, L)) return { rows: lapGap(along, 0, L) < 60 ? 3 : 2, fill: 0.8 };
  // The feed zone's side is the soigneurs'.
  if (day.feed && day.feed.side === side && inside(day.feed, along, L)) return NOBODY;
  if (day.climbs.some((c) => inside(c, along, L))) return { rows: 2, fill: 0.6 };
  if (day.bends.some((b) => lapGap(b.along, along, L) < 30)) return { rows: 1, fill: 0.55 };
  // Elsewhere a few together, here and there: the first metres of one block in three.
  const a = lapAlong(along, L);
  const block = Math.floor(a / 30);
  return a - block * 30 < 8 && hash(block, side, 881) < 0.33 ? { rows: 1, fill: 0.6 } : NOBODY;
}
