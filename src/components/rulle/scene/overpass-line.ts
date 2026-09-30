import type { Course, Overpass } from "@/modules/rulle";
import type { Frame } from "./building-writer";
import { ROAD_HALF } from "./ground";
import { roadPoint } from "./road-point";

/**
 * The line an overpass's deck runs along (`overpass-deck.ts`), in the world:
 * the map's line, drawn on past the road where it ends short of it, or
 * one straight across the road for a tunnel's roof the map does not name;
 * a point every few metres along it, and the line's own frame at any of
 * them.
 */

export type Pt = { x: number; z: number };

/**
 * A line drawn on past the road where the map's ends short of it: at
 * least `reach` metres from the road's middle on each side, along its own
 * way.
 */
export function pastTheRoad(course: Course, line: Pt[], list: Overpass[], at: number): Pt[] {
  const out = line.map((p) => ({ ...p }));
  for (const c of list) {
    const road = roadPoint(course, c.along, 0);
    const reach = at / Math.max(0.3, Math.sin(c.angle));
    for (const end of [0, out.length - 1]) {
      const tip = out[end]!;
      const next = out[end === 0 ? 1 : end - 1]!;
      const gone = Math.hypot(tip.x - road.x, tip.z - road.z);
      if (gone >= reach) continue;
      // On along the end's own way, out to where it should reach.
      const len = Math.hypot(tip.x - next.x, tip.z - next.z) || 1;
      const more = reach - gone;
      out[end] = {
        x: tip.x + ((tip.x - next.x) / len) * more,
        z: tip.z + ((tip.z - next.z) / len) * more,
      };
    }
  }
  return out;
}

/** A line across the road at `along`, for a tunnel's roof the map does not name. */
export function acrossRoad(course: Course, along: number): Pt[] {
  const reach = ROAD_HALF + 16;
  const a = roadPoint(course, along, -reach);
  const b = roadPoint(course, along, reach);
  return [
    { x: a.x, z: a.z },
    { x: b.x, z: b.z },
  ];
}

export function densify(line: Pt[], every: number): Pt[] {
  const out: Pt[] = [];
  for (let k = 0; k + 1 < line.length; k++) {
    const a = line[k]!;
    const b = line[k + 1]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / every));
    for (let i = 0; i < n; i++)
      out.push({ x: a.x + ((b.x - a.x) * i) / n, z: a.z + ((b.z - a.z) * i) / n });
  }
  out.push(line.at(-1)!);
  return out;
}

/** How far along the line the point nearest a place lies. */
export function arcAt(line: Pt[], arc: number[], x: number, z: number): number {
  let best = Infinity;
  let at = 0;
  for (let k = 0; k < line.length; k++) {
    const d = Math.hypot(line[k]!.x - x, line[k]!.z - z);
    if (d < best) {
      best = d;
      at = arc[k]!;
    }
  }
  return at;
}

/** The line's own frame at a point: `l` along it, `s` across it, the same way round as a building's. */
export function frameAt(line: Pt[], k: number, p: Pt): Frame {
  const a = line[Math.max(0, k - 1)]!;
  const b = line[Math.min(line.length - 1, k + 1)]!;
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const lx = (b.x - a.x) / len;
  const lz = (b.z - a.z) / len;
  return { x: p.x, z: p.z, lx, lz, sx: lz, sz: -lx };
}

/** The line's frame `s` metres along it, found by halving: what runs on a long bridge asks often. */
export function frameAtArc(line: Pt[], arc: number[], s: number): Frame {
  let k = 0;
  let hi = line.length - 1;
  while (hi - k > 1) {
    const mid = (k + hi) >> 1;
    if (arc[mid]! < s) k = mid;
    else hi = mid;
  }
  const a = line[k]!;
  const b = line[Math.min(line.length - 1, k + 1)]!;
  const span = (arc[k + 1] ?? arc[k]!) - arc[k]! || 1;
  const f = Math.max(0, Math.min(1, (s - arc[k]!) / span));
  return frameAt(line, k, { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f });
}

export const moved = (f: Frame, s: number): Frame => ({
  ...f,
  x: f.x + f.sx * s,
  z: f.z + f.sz * s,
});
