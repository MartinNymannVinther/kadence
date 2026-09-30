import * as THREE from "three";
import { PALETTE } from "./palette";

/**
 * What a building is written with (`buildings.ts`), straight into one
 * geometry: walls round a rectangle with windows in rows, a flat top, a
 * box; the roofs are `building-roofs.ts`. In a building's own frame: `l`
 * along its length, `s` across it, `y` up.
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

/** A rectangle's corners, counter-clockwise from above. */
export const CORNERS = (L: number, S: number): [number, number][] => [
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
