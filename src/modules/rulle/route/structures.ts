import type { Course } from "./course";
import type { Land, StructureKind } from "./land";
import type { Stretch } from "./race-day";

/**
 * The bridges and tunnels a route runs over, under and through (ADR 0037),
 * read from the land's structures (`land.ts`):
 *
 * - **decks**: where the road itself is on a bridge;
 * - **overpasses**: where something passes over the road — a railway, a
 *   motorway, a footbridge, a wildlife crossing — or the road runs through
 *   a tunnel under something the map does not name;
 * - **underpasses**: where a path or a farm track goes under the road in
 *   a tunnel of its own.
 *
 * A culvert, a stream in a pipe under the road, is none of these: nobody
 * sees it. In metres along the lap. Pure.
 */

type XY = { x: number; y: number };

export type Overpass = {
  along: number;
  kind: StructureKind;
  /** Its turn from the road's way, radians: π/2 square across. */
  angle: number;
  /** Its line on the course's plane, from end to end; none for a tunnel's unnamed roof. */
  points: XY[];
  /** Metres of road it covers: one track, or several side by side. */
  wide: number;
};

export type Underpass = { along: number; kind: StructureKind; angle: number };

export type Structures = { decks: Stretch[]; overpasses: Overpass[]; underpasses: Underpass[] };

export const STRUCTURES = {
  /** A structure this close to the road, and running its way, carries the road. */
  near: 6,
  turn: 0.45,
  /** A stretch along the road shorter than this is no deck of the road's own. */
  deckMin: 8,
  /** Metres added to each end of a deck, where the bridge meets the land. */
  deckEnds: 3,
  /** Overpasses closer than this along the road are one, as tracks side by side are. */
  together: 25,
} as const;

/** Metres of road what passes over covers, by what it carries. */
export const WIDE: Record<StructureKind, number> = {
  motorway: 26,
  road: 10,
  rail: 6,
  path: 3.5,
  green: 20,
  water: 6,
};

/** What a road the rider rides on can be. */
const OWN: StructureKind[] = ["road", "motorway", "path"];

/** Which of two kinds reads as the bigger thing overhead. */
const RANK: StructureKind[] = ["path", "water", "green", "road", "rail", "motorway"];

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** The angle between two ways, either way round: 0 along, π/2 across. */
const across = (a: number, b: number) => Math.abs(wrap(2 * (a - b))) / 2;

export function structuresOn(course: Course, structures: Land["structures"] = []): Structures {
  const n = course.x.length;
  const step = course.step;
  const heading = (i: number) => {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    return Math.atan2(course.y[b]! - course.y[a]!, course.x[b]! - course.x[a]!);
  };
  const decks: Stretch[] = [];
  const over: Overpass[] = [];
  const under: Underpass[] = [];

  for (const s of structures) {
    if (s.points.length < 2) continue;
    // Only the road near the structure is looked at.
    const box = boxOf(s.points, 40);
    const along: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = course.x[i]!;
      const y = course.y[i]!;
      if (x < box.x0 || x > box.x1 || y < box.y0 || y > box.y1) continue;
      const near = nearestOn(s.points, x, y);
      if (near.d <= STRUCTURES.near && across(near.heading, heading(i)) < STRUCTURES.turn)
        along.push(i);
      // Where it crosses the road: between this sample and the next.
      if (i + 1 >= n) continue;
      const hit = crossing(
        s.points,
        course.x[i]!,
        course.y[i]!,
        course.x[i + 1]!,
        course.y[i + 1]!,
      );
      if (!hit || across(hit.heading, heading(i)) < STRUCTURES.turn) continue;
      const at = (i + hit.t) * step;
      const angle = across(hit.heading, heading(i));
      if (s.bridge)
        over.push({ along: at, kind: s.kind, angle, points: s.points, wide: WIDE[s.kind] });
      else if (s.tunnel && s.kind !== "water") under.push({ along: at, kind: s.kind, angle });
    }
    // Runs of the road along the structure: the road's own bridge, or its own
    // tunnel. A railway or a stream beside the road, or under it, is not the road.
    if (!OWN.includes(s.kind)) continue;
    for (const run of runsOf(along, step)) {
      if (run.to - run.from < STRUCTURES.deckMin) continue;
      if (s.bridge)
        decks.push({ from: run.from - STRUCTURES.deckEnds, to: run.to + STRUCTURES.deckEnds });
      else if (s.tunnel)
        over.push({
          along: (run.from + run.to) / 2,
          kind: "road",
          angle: Math.PI / 2,
          points: [],
          wide: run.to - run.from,
        });
    }
  }
  return {
    decks: joined(decks),
    overpasses: together(over),
    underpasses: under.sort((a, b) => a.along - b.along),
  };
}

function boxOf(points: XY[], margin: number) {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  return { x0: x0 - margin, x1: x1 + margin, y0: y0 - margin, y1: y1 + margin };
}

/** The nearest point of a line to a place: how far, and which way the line runs there. */
function nearestOn(points: XY[], x: number, y: number): { d: number; heading: number } {
  let best = { d: Infinity, heading: 0 };
  for (let k = 0; k + 1 < points.length; k++) {
    const p = points[k]!;
    const q = points[k + 1]!;
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const f = Math.max(
      0,
      Math.min(1, ((x - p.x) * dx + (y - p.y) * dy) / (dx * dx + dy * dy || 1)),
    );
    const d = Math.hypot(p.x + f * dx - x, p.y + f * dy - y);
    if (d < best.d) best = { d, heading: Math.atan2(dy, dx) };
  }
  return best;
}

/** Where a line crosses the segment from (ax, ay) to (bx, by): how far along it (0–1), and the line's way. */
function crossing(
  points: XY[],
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { t: number; heading: number } | null {
  const rx = bx - ax;
  const ry = by - ay;
  for (let k = 0; k + 1 < points.length; k++) {
    const p = points[k]!;
    const q = points[k + 1]!;
    const sx = q.x - p.x;
    const sy = q.y - p.y;
    const denom = rx * sy - ry * sx;
    if (Math.abs(denom) < 1e-9) continue;
    const t = ((p.x - ax) * sy - (p.y - ay) * sx) / denom;
    const u = ((p.x - ax) * ry - (p.y - ay) * rx) / denom;
    if (t >= 0 && t < 1 && u >= 0 && u <= 1) return { t, heading: Math.atan2(sy, sx) };
  }
  return null;
}

/** Samples in a row, as stretches of road: a gap of more than two samples ends one. */
function runsOf(samples: number[], step: number): Stretch[] {
  const runs: Stretch[] = [];
  for (const i of samples) {
    const at = i * step;
    const last = runs.at(-1);
    if (last && at - last.to <= 2 * step) last.to = at;
    else runs.push({ from: at, to: at });
  }
  return runs;
}

/** Decks that meet or overlap, as one. */
function joined(decks: Stretch[]): Stretch[] {
  const out: Stretch[] = [];
  for (const d of decks.sort((a, b) => a.from - b.from)) {
    const last = out.at(-1);
    if (last && d.from <= last.to) last.to = Math.max(last.to, d.to);
    else out.push({ ...d });
  }
  return out;
}

/**
 * Overpasses close along the road, as one as wide as all of them: the
 * tracks of a station. What the map names wins over a tunnel's unnamed
 * roof, and the bigger thing over the smaller.
 */
function together(over: Overpass[]): Overpass[] {
  const out: (Overpass & { first: number; last: number })[] = [];
  for (const o of over.sort((a, b) => a.along - b.along)) {
    const last = out.at(-1);
    if (last && o.along - o.wide / 2 - last.last <= STRUCTURES.together) {
      last.first = Math.min(last.first, o.along - o.wide / 2);
      last.last = Math.max(last.last, o.along + o.wide / 2);
      last.along = (last.first + last.last) / 2;
      last.wide = last.last - last.first;
      const named = o.points.length > 0;
      if (named && (!last.points.length || RANK.indexOf(o.kind) > RANK.indexOf(last.kind))) {
        last.kind = o.kind;
        last.angle = o.angle;
        last.points = o.points;
      }
    } else out.push({ ...o, first: o.along - o.wide / 2, last: o.along + o.wide / 2 });
  }
  return out.map(({ first: _first, last: _last, ...o }) => o);
}
