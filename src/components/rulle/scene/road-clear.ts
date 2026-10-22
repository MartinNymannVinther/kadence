import type { Course } from "@/modules/rulle";
import { gridTriangle } from "./grid-triangle";
import { BRIDGE, groundAt, ROAD_HALF, sink, VERGE } from "./road-profile";

/**
 * The land kept under the road (ADR 0108). The land is drawn in triangles
 * twenty-five metres across, and only their corners know the land's
 * height; the road is drawn on its own, a sample every ten metres. Where
 * the land beside a road rises steeply — a road cut into a hillside, the
 * slope down to Vejle Fjord — a triangle that spans the road can have a
 * corner high up the slope, and its flat face then passes over the
 * asphalt: the rider rides in the hill. So, once a ride begins, every
 * place on the road and its verges is looked at, and where a triangle
 * would cover it its corners are lowered just enough that it does not —
 * each corner by as much as it counts there, so the nearest drops most and
 * the land up the slope is hardly touched. A road cut into a slope is what
 * that looks like. Only ever lowered: nothing is lifted over the road.
 * Pure: the corners' heights in, the lowered ones out.
 */

/** Metres along the road and across it between the places looked at. */
const ALONG = 2.5;
const ACROSS = 1;
/** How far below the road's surface the land is kept, metres; at the verge's foot it meets it. */
const BELOW = 0.05;
/** Rounds over every place; the corners settle in far fewer. */
const ROUNDS = 40;

/** The key a corner is remembered by: unique for any route's columns and rows. */
export const cornerKey = (a: number, b: number) => a * 262_144 + b;

export type RoadSides = {
  /** A city's streets: kerbs, a cycle track and a pavement in place of the verge (ADR 0036). */
  city: boolean;
  /** Whether the road is on a bridge `along` metres into the lap (ADR 0037). */
  onDeck: (along: number) => boolean;
};

/**
 * The corners near the road lowered so that no triangle covers it, by
 * their keys (`cornerKey`); a corner not in it is left as `height` has it.
 */
export function clearedCorners(
  course: Course,
  sides: RoadSides,
  height: (a: number, b: number) => number,
): Map<number, number> {
  const keys: number[] = [];
  const weights: number[] = [];
  const targets: number[] = [];
  const heights = new Map<number, number>();
  const raw = new Map<number, number>();
  for (const place of placesOnRoad(course, sides)) {
    const { corners, weights: w } = gridTriangle(place.x, place.z);
    for (let k = 0; k < 3; k++) {
      const [a, b] = corners[k]!;
      const key = cornerKey(a, b);
      if (!heights.has(key)) {
        const h = height(a, b);
        heights.set(key, h);
        raw.set(key, h);
      }
      keys.push(key);
      weights.push(w[k]!);
    }
    targets.push(place.y - (place.foot ? 0 : BELOW));
  }
  // Each place pushes the corners of its triangle down to it, as little as it can: in proportion
  // to how much each counts there. Only ever down, so what one place settles another cannot undo.
  for (let round = 0; round < ROUNDS; round++) {
    let moved = false;
    for (let p = 0; p < targets.length; p++) {
      let drawn = 0;
      let square = 0;
      for (let k = 0; k < 3; k++) {
        const w = weights[p * 3 + k]!;
        drawn += w * heights.get(keys[p * 3 + k]!)!;
        square += w * w;
      }
      const over = drawn - targets[p]!;
      if (over <= 1e-4) continue;
      moved = true;
      for (let k = 0; k < 3; k++) {
        const key = keys[p * 3 + k]!;
        heights.set(key, heights.get(key)! - (over * weights[p * 3 + k]!) / square);
      }
    }
    if (!moved) break;
  }
  const lowered = new Map<number, number>();
  for (const [key, h] of heights) if (h < raw.get(key)!) lowered.set(key, h);
  return lowered;
}

/** A place on the road or its sides, the height drawn there, and whether it is the verge's foot. */
type Place = { x: number; z: number; y: number; foot: boolean };

/**
 * Places on the road and its sides, every `ALONG` metres along it and
 * `ACROSS` across, with the height of what the road draws there: the
 * asphalt, the verge falling to the land or a city's pavements, or on a
 * bridge the deck's underside.
 */
function* placesOnRoad(course: Course, sides: RoadSides): Generator<Place> {
  const n = course.x.length;
  const city = sides.city;
  const verge = ROAD_HALF + VERGE;
  const deckWide = ROAD_HALF + BRIDGE.edge + BRIDGE.wall;
  const parts = Math.max(1, Math.round(course.step / ALONG));
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const deck = sides.onDeck(i * course.step) || sides.onDeck(j * course.step);
    const ax = course.x[i]!;
    const az = -course.y[i]!;
    const bx = course.x[j]!;
    const bz = -course.y[j]!;
    const len = Math.hypot(bx - ax, bz - az) || 1;
    const rx = -(bz - az) / len;
    const rz = (bx - ax) / len;
    const sa = sink(course, i);
    const sb = sink(course, j);
    for (let q = 0; q < parts; q++) {
      const f = q / parts;
      const cx = ax + (bx - ax) * f;
      const cz = az + (bz - az) * f;
      const cy = course.ele[i]! + (course.ele[j]! - course.ele[i]!) * f;
      const sunk = sa + (sb - sa) * f;
      const wide = deck ? deckWide : verge;
      for (let off = -wide; off <= wide + 1e-9; off += ACROSS) {
        const y = deck ? cy - BRIDGE.depth : cy + groundAt(off, sunk, city);
        const foot = !deck && Math.abs(off) > verge - ACROSS / 2;
        yield { x: cx + rx * off, z: cz + rz * off, y, foot };
      }
    }
  }
}
