import * as THREE from "three";
import type { StructureKind } from "@/modules/rulle";
import { box, Writer, type Frame, type V } from "./building-writer";
import { ROAD_HALF, type Ground } from "./ground";
import type { DeckLine } from "./overpass-deck";
import { frameAt, frameAtArc, moved } from "./overpass-line";
import { PALETTE as P } from "./palette";
import { drawnHeight } from "./terrain";

/**
 * What passes over the road (ADR 0037), drawn from end to end along its
 * own line from the map: a motorway's deck and its guard rails, a
 * railway's ballast and rails, a footbridge's railings, a wildlife
 * crossing's green; how high and how far is its deck's (`overpass-deck.ts`).
 * Walls stand either side of the road under it, piers along it where the
 * land lies low, and an abutment at each end; none stands on the road —
 * one whose footprint comes near it anywhere is left out (`offTheRoad`),
 * whatever the angle the deck crosses at (ADR 0108).
 */

/** How a deck looks, by what it carries: its top, its sides, its parapets. */
type Look = { top: string; side: string; parapet: number; rail: string };

const LOOK: Record<StructureKind, Look> = {
  motorway: { top: P.road, side: P.bridge, parapet: 0.9, rail: P.metal },
  road: { top: P.road, side: P.bridge, parapet: 1, rail: P.bridge },
  rail: { top: P.ballast, side: P.bridgeShade, parapet: 0.9, rail: P.bridgeShade },
  path: { top: P.pavement, side: P.bridge, parapet: 1.1, rail: P.metal },
  green: { top: P.verge, side: P.bridge, parapet: 1.7, rail: P.hedge[0] },
  water: { top: P.water, side: P.bridge, parapet: 0.8, rail: P.bridge },
};

/** Metres between piers along a long one. */
const PIERS_APART = 42;
/** Nothing under a deck stands nearer the road's middle than this, metres: off the asphalt, with room. */
const OFF_ROAD = ROAD_HALF + 1.5;

/** Every deck over the road, as one geometry; null where there is none. */
export function overpassShapes(
  ground: Ground,
  decks: readonly DeckLine[],
): THREE.BufferGeometry | null {
  const w = new Writer();
  for (const deck of decks) drawOne(w, ground, deck);
  if (w.count === 0) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(w.positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(w.colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function drawOne(w: Writer, ground: Ground, deck: DeckLine): void {
  const { kind, line, arc, width, thick, top } = deck;
  const look = LOOK[kind];
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
      at(a, -half, ta - thick),
      at(a, half, ta - thick),
      at(b, half, tb - thick),
      at(b, -half, tb - thick),
      P.bridge,
    );
    for (const side of [-half, half]) {
      both(
        w,
        at(a, side, ta - thick),
        at(b, side, tb - thick),
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
    if (kind === "rail")
      for (const s of railsAcross(width))
        both(
          w,
          at(a, s - 0.04, ta + 0.18),
          at(a, s + 0.04, ta + 0.18),
          at(b, s + 0.04, tb + 0.18),
          at(b, s - 0.04, tb + 0.18),
          P.metal,
        );
  }
  for (const p of supports(ground, deck))
    box(w, p.f, 0, 0, p.along, p.across, p.base, p.under, P.bridgeShade);
}

/** A wall, an abutment or a pier under a deck: where, `across` wide and `along` thick, from `base` up to `under`. */
export type Support = {
  f: Frame;
  along: number;
  across: number;
  base: number;
  under: number;
};

/** What holds a deck up, only where it stands on land below the deck and off the road. */
export function supports(ground: Ground, deck: DeckLine): Support[] {
  const { line, arc, length, width, thick, top, lifts } = deck;
  const out: Support[] = [];
  const add = (f: Frame, under: number, across: number, along: number) => {
    const base = drawnHeight(ground, f.x, f.z) - 1;
    if (under - base < 1 || !offTheRoad(ground, f, along, across)) return;
    out.push({ f, along, across, base, under });
  };
  // Walls either side of the road, under it, from the land up to the deck.
  for (const l of lifts)
    for (const way of [-1, 1]) {
      const s = l.s + way * l.hold;
      if (s < 0 || s > length) continue;
      add(frameAtArc(line, arc, s), top(s) - thick, width, 1.4);
    }
  // An abutment at each end, where the bridge meets the land.
  for (const s of [0.6, length - 0.6]) add(frameAtArc(line, arc, s), top(s) - thick, width, 1.2);
  // Piers along a long one where the land lies low.
  for (let s = PIERS_APART / 2; s < length; s += PIERS_APART) {
    const f = frameAtArc(line, arc, s);
    const under = top(s) - thick;
    if (under - drawnHeight(ground, f.x, f.z) < 2.5) continue;
    if (width > 14)
      for (const off of [-width / 4, width / 4]) add(moved(f, off), under, width * 0.3, 2.2);
    else add(f, under, width * 0.6, 2);
  }
  return out;
}

/** Where a railway deck's rails lie across it: a pair for each track. */
export function railsAcross(width: number): number[] {
  const tracks = Math.max(1, Math.round(width / 4.5));
  const out: number[] = [];
  for (let n = 0; n < tracks; n++) {
    const middle = -width / 2 + ((n + 0.5) * width) / tracks;
    out.push(middle - 0.72, middle + 0.72);
  }
  return out;
}

/**
 * Whether a footprint `along` by `across` metres in frame `f` keeps clear
 * of the road: every point of its outline, a metre apart, at least
 * `OFF_ROAD` from the road's middle line.
 */
export function offTheRoad(ground: Ground, f: Frame, along: number, across: number): boolean {
  const reach = OFF_ROAD + Math.hypot(along, across);
  if (ground.nearest(f.x, f.z, reach).d >= reach) return true;
  for (const [l, s] of outline(along, across)) {
    const x = f.x + f.lx * l + f.sx * s;
    const z = f.z + f.lz * l + f.sz * s;
    if (ground.nearest(x, z, OFF_ROAD + 1).d < OFF_ROAD) return false;
  }
  return true;
}

/** The outline of an `along` by `across` rectangle round its middle, a point every metre or less. */
function outline(along: number, across: number): [number, number][] {
  const out: [number, number][] = [];
  const nl = Math.max(1, Math.ceil(along));
  const ns = Math.max(1, Math.ceil(across));
  for (let i = 0; i <= nl; i++)
    for (const s of [-across / 2, across / 2]) out.push([-along / 2 + (along * i) / nl, s]);
  for (let j = 1; j < ns; j++)
    for (const l of [-along / 2, along / 2]) out.push([l, -across / 2 + (across * j) / ns]);
  return out;
}

/** A face drawn from both sides, so it is seen whichever way it is wound. */
function both(w: Writer, a: V, b: V, c: V, d: V, hex: string): void {
  w.quad(a, b, c, d, hex);
  w.quad(a, d, c, b, hex);
}
