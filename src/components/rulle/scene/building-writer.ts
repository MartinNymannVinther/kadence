import * as THREE from "three";
import type { RoofShape } from "@/modules/rulle";
import { PALETTE } from "./palette";

/**
 * What a building is written with (`buildings.ts`), straight into one
 * geometry: walls round a rectangle with windows in rows, and a roof —
 * flat, gabled, hipped, a pyramid or a spire, or a dome. In a building's
 * own frame: `l` along its length, `s` across it, `y` up.
 */

export type V = readonly [number, number, number];

const rgb = new Map<string, [number, number, number]>();
function color(hex: string): [number, number, number] {
  let found = rgb.get(hex);
  if (!found) {
    const c = new THREE.Color(hex);
    found = [c.r, c.g, c.b];
    rgb.set(hex, found);
  }
  return found;
}

export class Writer {
  readonly positions: number[] = [];
  readonly colors: number[] = [];

  tri(a: V, b: V, c: V, hex: string): void {
    const [r, g, bl] = color(hex);
    for (const p of [a, b, c]) {
      this.positions.push(p[0], p[1], p[2]);
      this.colors.push(r, g, bl);
    }
  }

  /** Four corners counter-clockwise as seen from the side the face looks to. */
  quad(a: V, b: V, c: V, d: V, hex: string): void {
    this.tri(a, b, c, hex);
    this.tri(a, c, d, hex);
  }

  get count(): number {
    return this.positions.length / 3;
  }
}

/** A place in a building's own frame: `l` along its length, `s` across it, `y` up. */
export type Frame = { x: number; z: number; lx: number; lz: number; sx: number; sz: number };
export const at = (f: Frame, l: number, s: number, y: number): V => [
  f.x + f.lx * l + f.sx * s,
  y,
  f.z + f.lz * l + f.sz * s,
];

/** The frame of a moved middle, the same way round. */
export const moved = (f: Frame, l: number, s: number): Frame => {
  const [x, , z] = at(f, l, s, 0);
  return { ...f, x, z };
};

export const choose = (colors: readonly string[], weights: readonly number[], roll: number) => {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i]!;
    if (roll < sum) return colors[i]!;
  }
  return colors[colors.length - 1]!;
};

export type Windows = {
  floor: number;
  rows: number;
  storey: number;
  spacing: number;
  wide: number;
  tall: number;
  framed: boolean;
};

const CORNERS = (L: number, S: number): [number, number][] => [
  [-L / 2, -S / 2],
  [L / 2, -S / 2],
  [L / 2, S / 2],
  [-L / 2, S / 2],
];

/** Walls from `bottom` to `top` round a rectangle of `L` by `S`, and on each, windows. */
export function walls(
  w: Writer,
  f: Frame,
  L: number,
  S: number,
  bottom: number,
  top: number,
  hex: string,
  windows: Windows | null,
): void {
  const corners = CORNERS(L, S);
  for (let k = 0; k < 4; k++) {
    const [l0, s0] = corners[k]!;
    const [l1, s1] = corners[(k + 1) % 4]!;
    w.quad(
      at(f, l0, s0, bottom),
      at(f, l1, s1, bottom),
      at(f, l1, s1, top),
      at(f, l0, s0, top),
      hex,
    );
    if (!windows) continue;
    const length = Math.hypot(l1 - l0, s1 - s0);
    const count = Math.floor((length - 1.2) / windows.spacing);
    if (count < 1) continue;
    // Along the wall, and out of it: the wall's outside is to its right, going round.
    const ul = (l1 - l0) / length;
    const us = (s1 - s0) / length;
    const ol = us;
    const os = -ul;
    for (let row = 0; row < windows.rows; row++) {
      const sill = windows.floor + 0.95 + row * windows.storey;
      if (sill + windows.tall > top - 0.3) break;
      for (let i = 0; i < count; i++) {
        const t = length / 2 + (i - (count - 1) / 2) * windows.spacing;
        const pane = (grow: number, out: number, shade: string) => {
          const half = windows.wide / 2 + grow;
          const cl = l0 + ul * t + ol * out;
          const cs = s0 + us * t + os * out;
          w.quad(
            at(f, cl - ul * half, cs - us * half, sill - grow),
            at(f, cl + ul * half, cs + us * half, sill - grow),
            at(f, cl + ul * half, cs + us * half, sill + windows.tall + grow),
            at(f, cl - ul * half, cs - us * half, sill + windows.tall + grow),
            shade,
          );
        };
        if (windows.framed) pane(0.1, 0.04, PALETTE.windowFrame);
        pane(0, 0.07, PALETTE.window);
      }
    }
  }
}

export function flat(w: Writer, f: Frame, L: number, S: number, top: number, roof: string): void {
  const [a, b, c, d] = CORNERS(L, S);
  w.quad(at(f, ...a!, top), at(f, ...b!, top), at(f, ...c!, top), at(f, ...d!, top), roof);
}

/** A gabled roof over a rectangle, its ridge along the length, eaves at `eaves`, `rise` higher at the ridge. */
export function gable(
  w: Writer,
  f: Frame,
  L: number,
  S: number,
  eaves: number,
  rise: number,
  wall: string,
  roof: string,
): void {
  const o = 0.35;
  const low = eaves - o * (rise / (S / 2));
  const ridge = eaves + rise;
  const e = L / 2 + o;
  const t = S / 2 + o;
  w.quad(at(f, -e, -t, low), at(f, e, -t, low), at(f, e, 0, ridge), at(f, -e, 0, ridge), roof);
  w.quad(at(f, e, t, low), at(f, -e, t, low), at(f, -e, 0, ridge), at(f, e, 0, ridge), roof);
  w.tri(at(f, -L / 2, S / 2, eaves), at(f, -L / 2, -S / 2, eaves), at(f, -L / 2, 0, ridge), wall);
  w.tri(at(f, L / 2, -S / 2, eaves), at(f, L / 2, S / 2, eaves), at(f, L / 2, 0, ridge), wall);
}

/** A hipped roof: every side slopes up, to a ridge along the length (or a point on a square). */
export function hipped(
  w: Writer,
  f: Frame,
  L: number,
  S: number,
  eaves: number,
  rise: number,
  roof: string,
): void {
  const r = Math.max(0, L / 2 - S / 2);
  const ridge = eaves + rise;
  const [a, b, c, d] = CORNERS(L, S).map(([l, s]) => at(f, l, s, eaves));
  const back = at(f, -r, 0, ridge);
  const front = at(f, r, 0, ridge);
  w.quad(a!, b!, front, back, roof);
  w.quad(c!, d!, back, front, roof);
  w.tri(b!, c!, front, roof);
  w.tri(d!, a!, back, roof);
}

/** A pyramid over a rectangle, its point `apex` high: a tower's roof, or a spire. */
export function pyramid(
  w: Writer,
  f: Frame,
  L: number,
  S: number,
  eaves: number,
  apex: number,
  roof: string,
): void {
  const tip = at(f, 0, 0, apex);
  const corners = CORNERS(L + 0.3, S + 0.3);
  for (let k = 0; k < 4; k++) {
    const [l0, s0] = corners[k]!;
    const [l1, s1] = corners[(k + 1) % 4]!;
    w.tri(at(f, l0, s0, eaves), at(f, l1, s1, eaves), tip, roof);
  }
}

/** A dome over a rectangle: rings of eight, rounding up to its top. */
export function dome(
  w: Writer,
  f: Frame,
  L: number,
  S: number,
  eaves: number,
  rise: number,
  roof: string,
): void {
  const SIDES = 8;
  const RINGS = 4;
  const ring = (k: number): V[] => {
    const a = (k / RINGS) * (Math.PI / 2);
    const out: V[] = [];
    for (let i = 0; i < SIDES; i++) {
      const t = (i / SIDES) * Math.PI * 2;
      out.push(
        at(
          f,
          (Math.cos(t) * L * Math.cos(a)) / 2,
          (Math.sin(t) * S * Math.cos(a)) / 2,
          eaves + rise * Math.sin(a),
        ),
      );
    }
    return out;
  };
  // Round the building's top first, where the dome sits.
  flat(w, f, L, S, eaves, roof);
  let lower = ring(0);
  for (let k = 1; k <= RINGS; k++) {
    const upper = ring(k);
    for (let i = 0; i < SIDES; i++) {
      const j = (i + 1) % SIDES;
      if (k === RINGS) w.tri(lower[i]!, lower[j]!, upper[i]!, roof);
      else w.quad(lower[i]!, lower[j]!, upper[j]!, upper[i]!, roof);
    }
    lower = upper;
  }
}

/** A box's sides and top: a chimney, a church's tower. */
export function box(
  w: Writer,
  f: Frame,
  l: number,
  s: number,
  L: number,
  S: number,
  bottom: number,
  top: number,
  hex: string,
): void {
  const g = moved(f, l, s);
  walls(w, g, L, S, bottom, top, hex, null);
  flat(w, g, L, S, top, hex);
}

/** How high a roof of a shape rises over a building `S` across, where `span` is all there is to it. */
export function riseOf(shape: RoofShape, L: number, S: number, span: number): number {
  switch (shape) {
    case "flat":
    case "skillion":
    case "unsaid":
      return 0;
    case "gabled":
      return Math.min((S / 2) * 0.85, span * 0.35);
    case "hipped":
    case "mansard":
      return Math.min((S / 2) * 0.7, span * 0.3);
    case "pyramidal":
      // A slim one standing high is a spire, all roof.
      return span > Math.max(L, S) * 1.5 ? span * 0.95 : Math.min(Math.max(L, S) * 0.8, span * 0.6);
    case "dome":
      return Math.min(Math.min(L, S) / 2, span * 0.6);
  }
}

/** A roof of a shape at `eaves`, rising `rise`, over a rectangle. */
export function roofOf(
  w: Writer,
  f: Frame,
  shape: RoofShape,
  L: number,
  S: number,
  eaves: number,
  rise: number,
  wall: string,
  roof: string,
): void {
  if (rise <= 0.05) return flat(w, f, L, S, eaves, roof);
  switch (shape) {
    case "gabled":
      return gable(w, f, L, S, eaves, rise, wall, roof);
    case "hipped":
    case "mansard":
      return hipped(w, f, L, S, eaves, rise, roof);
    case "pyramidal":
      return pyramid(w, f, L, S, eaves, eaves + rise, roof);
    case "dome":
      return dome(w, f, L, S, eaves, rise, roof);
    default:
      return flat(w, f, L, S, eaves, roof);
  }
}
