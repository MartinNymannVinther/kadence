import * as THREE from "three";
import type { Course, Overpass, StructureKind } from "@/modules/rulle";
import { box, Writer, type Frame, type V } from "./building-writer";
import { ROAD_HALF, type Ground } from "./ground";
import {
  acrossRoad,
  arcAt,
  densify,
  frameAt,
  frameAtArc,
  moved,
  pastTheRoad,
  type Pt,
} from "./overpass-line";
import { PALETTE as P } from "./palette";
import { roadPoint } from "./road-point";
import { drawnHeight } from "./terrain";

/**
 * What passes over the road (ADR 0037), drawn from end to end along its
 * own line from the map: a motorway's deck and its guard rails, a
 * railway's ballast and rails, a footbridge's railings, a wildlife
 * crossing's green. How high it runs is the land's at its two ends, raised
 * where the road passes under it to leave room over the road, and sloping
 * down again at a ramp's gradient. A bridge the map draws shorter than the
 * road is wide is drawn on past it to its abutments. Walls stand either
 * side of the road under it, piers along it where the land lies low, and
 * an abutment at each end; none stands on the road.
 */

type Look = {
  /** Metres across, where the map gives one way only. */
  width: number;
  /** The deck's depth, and the room it leaves over the road below. */
  thick: number;
  clear: number;
  top: string;
  side: string;
  /** Its parapets' height, and their colour. */
  parapet: number;
  rail: string;
};

const LOOK: Record<StructureKind, Look> = {
  motorway: {
    width: 26,
    thick: 1.8,
    clear: 5.2,
    top: P.road,
    side: P.bridge,
    parapet: 0.9,
    rail: P.metal,
  },
  road: {
    width: 10,
    thick: 1.3,
    clear: 5,
    top: P.road,
    side: P.bridge,
    parapet: 1,
    rail: P.bridge,
  },
  rail: {
    width: 6,
    thick: 1.5,
    clear: 5.4,
    top: P.ballast,
    side: P.bridgeShade,
    parapet: 0.9,
    rail: P.bridgeShade,
  },
  path: {
    width: 3.5,
    thick: 0.6,
    clear: 4.6,
    top: P.pavement,
    side: P.bridge,
    parapet: 1.1,
    rail: P.metal,
  },
  green: {
    width: 20,
    thick: 1.6,
    clear: 4.8,
    top: P.verge,
    side: P.bridge,
    parapet: 1.7,
    rail: P.hedge[0],
  },
  water: {
    width: 6,
    thick: 1.3,
    clear: 4.6,
    top: P.water,
    side: P.bridge,
    parapet: 0.8,
    rail: P.bridge,
  },
};

/** Metres between the deck's sections, how steeply it slopes down from over the road, and between piers. */
const EVERY = 6;
const RAMP = 0.06;
const PIERS_APART = 42;

/** Everything that passes over the road, as one geometry; null where nothing does. */
export function overpassShapes(
  course: Course,
  ground: Ground,
  overpasses: readonly Overpass[],
): THREE.BufferGeometry | null {
  const w = new Writer();
  // One drawing for each line, lifted over every place the road passes under it.
  const lines = new Map<object, Overpass[]>();
  for (const o of overpasses) {
    const key = o.points.length > 0 ? o.points : o;
    lines.set(key, [...(lines.get(key) ?? []), o]);
  }
  for (const list of lines.values()) drawOne(w, course, ground, list);
  if (w.count === 0) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(w.positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(w.colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function drawOne(w: Writer, course: Course, ground: Ground, list: Overpass[]): void {
  const o = list[0]!;
  const look = LOOK[o.kind];
  // Its line in the world, a section every few metres: the map's, or one across the road.
  const raw: Pt[] =
    o.points.length > 0 ? o.points.map((p) => ({ x: p.x, z: -p.y })) : acrossRoad(course, o.along);
  const line = densify(pastTheRoad(course, raw, list), EVERY);
  const arc = [0];
  for (let k = 1; k < line.length; k++)
    arc.push(arc[k - 1]! + Math.hypot(line[k]!.x - line[k - 1]!.x, line[k]!.z - line[k - 1]!.z));
  const length = arc.at(-1)!;
  if (length < 1) return;
  const width = Math.max(look.width, Math.min(90, o.wide * Math.sin(o.angle)));
  // The land at its two ends, and room over the road wherever it passes over.
  const land = (p: Pt) => ground.land?.heightAt(p.x, -p.z) ?? ground.height(p.x, p.z);
  const h0 = land(line[0]!);
  const h1 = land(line.at(-1)!);
  const base = (s: number) => h0 + ((h1 - h0) * s) / length;
  const lifts = list.map((c) => {
    const road = roadPoint(course, c.along, 0);
    const s = arcAt(line, arc, road.x, road.z);
    return { s, lift: road.y + look.clear + look.thick - base(s), angle: c.angle };
  });
  const top = (s: number) =>
    base(s) + Math.max(0, ...lifts.map((l) => l.lift - Math.abs(s - l.s) * RAMP));

  const frames = line.map((p, k) => frameAt(line, k, p));
  for (let k = 0; k + 1 < line.length; k++) {
    const a = frames[k]!;
    const b = frames[k + 1]!;
    const ta = top(arc[k]!);
    const tb = top(arc[k + 1]!);
    const at = (f: Frame, s: number, y: number): V => [f.x + f.sx * s, y, f.z + f.sz * s];
    const half = width / 2;
    both(w, at(a, -half, ta), at(a, half, ta), at(b, half, tb), at(b, -half, tb), look.top);
    both(
      w,
      at(a, -half, ta - look.thick),
      at(a, half, ta - look.thick),
      at(b, half, tb - look.thick),
      at(b, -half, tb - look.thick),
      P.bridge,
    );
    for (const side of [-half, half]) {
      both(
        w,
        at(a, side, ta - look.thick),
        at(b, side, tb - look.thick),
        at(b, side, tb),
        at(a, side, ta),
        look.side,
      );
      both(
        w,
        at(a, side, ta),
        at(b, side, tb),
        at(b, side, tb + look.parapet),
        at(a, side, ta + look.parapet),
        look.rail,
      );
    }
    // A railway's rails, a pair for each track across it.
    if (o.kind === "rail") {
      const tracks = Math.max(1, Math.round(width / 4.5));
      for (let n = 0; n < tracks; n++) {
        const middle = -half + ((n + 0.5) * width) / tracks;
        for (const r of [-0.72, 0.72]) {
          const s = middle + r;
          both(
            w,
            at(a, s - 0.04, ta + 0.18),
            at(a, s + 0.04, ta + 0.18),
            at(b, s + 0.04, tb + 0.18),
            at(b, s - 0.04, tb + 0.18),
            P.metal,
          );
        }
      }
    }
  }
  // Walls either side of the road, under it, from the land up to the deck.
  for (const l of lifts)
    for (const way of [-1, 1]) {
      const s = l.s + (way * (ROAD_HALF + 3.2)) / Math.max(0.3, Math.sin(l.angle));
      if (s < 0 || s > length) continue;
      pier(w, ground, frameAtArc(line, arc, s), top(s) - look.thick, width, 1.4);
    }
  // An abutment at each end, where the bridge meets the land.
  for (const s of [0.6, length - 0.6])
    pier(w, ground, frameAtArc(line, arc, s), top(s) - look.thick, width, 1.2);
  // Piers along a long one where the land lies low, never on the road.
  for (let s = PIERS_APART / 2; s < length; s += PIERS_APART) {
    const f = frameAtArc(line, arc, s);
    if (ground.nearest(f.x, f.z, 15).d < ROAD_HALF + 4) continue;
    const under = top(s) - look.thick;
    if (under - drawnHeight(ground, f.x, f.z) < 2.5) continue;
    if (width > 14)
      for (const off of [-width / 4, width / 4])
        pier(w, ground, moved(f, off), under, width * 0.3, 2.2);
    else pier(w, ground, f, under, width * 0.6, 2);
  }
}

/** A pier or a wall under a deck: `across` wide, `along` thick, from the land up to `under`. */
function pier(
  w: Writer,
  ground: Ground,
  f: Frame,
  under: number,
  across: number,
  along: number,
): void {
  const base = drawnHeight(ground, f.x, f.z) - 1;
  if (under - base < 1) return;
  box(w, f, 0, 0, along, across, base, under, P.bridgeShade);
}

/** A face drawn from both sides, so it is seen whichever way it is wound. */
function both(w: Writer, a: V, b: V, c: V, d: V, hex: string): void {
  w.quad(a, b, c, d, hex);
  w.quad(a, d, c, b, hex);
}
