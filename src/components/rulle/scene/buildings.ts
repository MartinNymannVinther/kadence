import * as THREE from "three";
import type { BuildingKind } from "@/modules/rulle";
import { hash } from "./noise";
import { PALETTE } from "./palette";

/**
 * Buildings as the land has them (ADR 0035), written straight into one
 * geometry for a chunk: the rectangle round each footprint, walls as high
 * as its storeys, a gabled roof on a house or a farm and a flat one on a
 * hall or some blocks of flats, a church's nave and its tower at the west
 * end, a chimney, and windows in rows. The colours come from the
 * building's own number: whitewashed, yellow or red brick, under red
 * tiles, black or grey. What a stop needs room for is folded away.
 */

export type Footprint = {
  /** The middle, world coordinates. */
  x: number;
  z: number;
  /** Its two sides, metres, and the turn of the first from east, counter-clockwise from above. */
  w: number;
  d: number;
  angle: number;
  kind: BuildingKind;
  levels: number;
  seed: number;
};

type V = readonly [number, number, number];

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

class Writer {
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
type Frame = { x: number; z: number; lx: number; lz: number; sx: number; sz: number };
const at = (f: Frame, l: number, s: number, y: number): V => [
  f.x + f.lx * l + f.sx * s,
  y,
  f.z + f.lz * l + f.sz * s,
];

const choose = (colors: readonly string[], weights: readonly number[], roll: number) => {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i]!;
    if (roll < sum) return colors[i]!;
  }
  return colors[colors.length - 1]!;
};

/** Walls from `bottom` to `top` round a rectangle of `L` by `S`, and on each, windows. */
function walls(
  w: Writer,
  f: Frame,
  L: number,
  S: number,
  bottom: number,
  top: number,
  hex: string,
  windows: {
    floor: number;
    rows: number;
    storey: number;
    spacing: number;
    wide: number;
    tall: number;
    framed: boolean;
  } | null,
): void {
  const corners: [number, number][] = [
    [-L / 2, -S / 2],
    [L / 2, -S / 2],
    [L / 2, S / 2],
    [-L / 2, S / 2],
  ];
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

/** A gabled roof over a rectangle, its ridge along the length, eaves at `eaves`, `rise` higher at the ridge. */
function gable(
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

function flat(w: Writer, f: Frame, L: number, S: number, top: number, roof: string): void {
  w.quad(
    at(f, -L / 2, -S / 2, top),
    at(f, L / 2, -S / 2, top),
    at(f, L / 2, S / 2, top),
    at(f, -L / 2, S / 2, top),
    roof,
  );
}

/** A box's sides and top: a chimney, a church's tower. */
function box(
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
  const g: Frame = { ...f, x: at(f, l, s, 0)[0], z: at(f, l, s, 0)[2] };
  walls(w, g, L, S, bottom, top, hex, null);
  flat(w, g, L, S, top, hex);
}

function pyramid(
  w: Writer,
  f: Frame,
  l: number,
  T: number,
  eaves: number,
  apex: number,
  hex: string,
): void {
  const h = T / 2 + 0.2;
  const tip = at(f, l, 0, apex);
  const c: [number, number][] = [
    [-h, -h],
    [h, -h],
    [h, h],
    [-h, h],
  ];
  for (let k = 0; k < 4; k++) {
    const [a0, b0] = c[k]!;
    const [a1, b1] = c[(k + 1) % 4]!;
    w.tri(at(f, l + a0, b0, eaves), at(f, l + a1, b1, eaves), tip, hex);
  }
}

/**
 * Writes a building standing on the land, whose height at a place is
 * `height`; returns nothing, the writer has it.
 */
function write(w: Writer, b: Footprint, height: (x: number, z: number) => number): void {
  // The long side's way, and across it, in world coordinates (z is south, so the turn's sine flips).
  const ux = Math.cos(b.angle);
  const uz = -Math.sin(b.angle);
  const long = b.w >= b.d;
  const L = long ? b.w : b.d;
  const S = long ? b.d : b.w;
  const lx = long ? ux : uz;
  const lz = long ? uz : -ux;
  // Across it to the left, seen from above: the corners then go round counter-clockwise.
  const f: Frame = { x: b.x, z: b.z, lx, lz, sx: lz, sz: -lx };
  let low = Infinity;
  let high = -Infinity;
  for (const [l, s] of [
    [-L / 2, -S / 2],
    [L / 2, -S / 2],
    [L / 2, S / 2],
    [-L / 2, S / 2],
    [0, 0],
  ] as const) {
    const [x, , z] = at(f, l, s, 0);
    const y = height(x, z);
    low = Math.min(low, y);
    high = Math.max(high, y);
  }
  const bottom = low - 0.35;
  const r = (salt: number) => hash(b.seed, salt, 501);
  switch (b.kind) {
    case "church": {
      // The tower at the west end, the nave east of it.
      const west = lx > 0 ? -1 : 1;
      const T = Math.min(S * 1.05, 8.5);
      const towerAt = west * (L / 2 - T / 2);
      const naveL = Math.max(8, L - T);
      const naveAt = -west * (T / 2);
      const nave: Frame = { ...f, x: at(f, naveAt, 0, 0)[0], z: at(f, naveAt, 0, 0)[2] };
      const naveS = Math.min(S, 11);
      walls(w, nave, naveL, naveS, bottom, high + 7, PALETTE.wall, {
        floor: high + 1,
        rows: 1,
        storey: 3,
        spacing: 4.5,
        wide: 1.1,
        tall: 2.6,
        framed: false,
      });
      gable(w, nave, naveL, naveS, high + 7, naveS * 0.55, PALETTE.wall, PALETTE.roofRed);
      box(w, f, towerAt, 0, T, T, bottom, high + 17, PALETTE.tower);
      pyramid(w, f, towerAt, T, high + 17, high + 22, PALETTE.roofRed);
      return;
    }
    case "big": {
      const top = high + Math.max(6.5, 3.6 * b.levels);
      const wall = choose(PALETTE.hall, [0.6, 0.4], r(1));
      walls(w, f, L, S, bottom, top, wall, {
        floor: high + 1.4,
        rows: 1,
        storey: 4,
        spacing: 5.5,
        wide: 2,
        tall: 1.1,
        framed: false,
      });
      flat(w, f, L, S, top, PALETTE.flatRoof);
      return;
    }
    case "block": {
      const levels = b.levels > 1 ? b.levels : 3;
      const top = high + 3 * levels + 0.4;
      const wall = choose(PALETTE.blockWalls, [0.45, 0.3, 0.25], r(1));
      walls(w, f, L, S, bottom, top, wall, {
        floor: high,
        rows: levels,
        storey: 3,
        spacing: 2.9,
        wide: 1.3,
        tall: 1.35,
        framed: false,
      });
      if (r(2) < 0.5)
        gable(w, f, L, S, top, (S / 2) * 0.6, wall, choose(PALETTE.roofs, [0.5, 0.5], r(3)));
      else flat(w, f, L, S, top, PALETTE.flatRoof);
      return;
    }
    case "farm": {
      const top = high + 4.2 + (b.levels > 1 ? 2.8 * (b.levels - 1) : 0);
      const wall = choose(
        [PALETTE.walls[0], PALETTE.walls[2], PALETTE.walls[3]],
        [0.5, 0.3, 0.2],
        r(1),
      );
      walls(w, f, L, S, bottom, top, wall, {
        floor: high + 0.6,
        rows: 1,
        storey: 3,
        spacing: 6,
        wide: 0.9,
        tall: 0.7,
        framed: false,
      });
      gable(
        w,
        f,
        L,
        S,
        top,
        (S / 2) * 0.55,
        wall,
        choose([PALETTE.roofs[3], PALETTE.roofs[1], PALETTE.roofs[0]], [0.45, 0.3, 0.25], r(3)),
      );
      return;
    }
    case "house": {
      const levels = Math.max(1, b.levels);
      const top = high + 2.8 * levels + 0.3;
      const wall = choose(PALETTE.walls, [0.35, 0.25, 0.3, 0.1], r(1));
      walls(w, f, L, S, bottom, top, wall, {
        floor: high,
        rows: levels,
        storey: 2.8,
        spacing: 3.4,
        wide: 1.05,
        tall: 1.15,
        framed: true,
      });
      const rise = Math.min((S / 2) * 0.85, 5);
      gable(w, f, L, S, top, rise, wall, choose(PALETTE.roofs, [0.45, 0.3, 0.15, 0.1], r(3)));
      if (r(4) < 0.6 && L > 7)
        box(
          w,
          f,
          L * (r(5) - 0.5) * 0.5,
          -0.8,
          0.6,
          0.6,
          top + rise * 0.5,
          top + rise + 0.9,
          "#8f5643",
        );
      return;
    }
  }
}

export type Buildings = THREE.Mesh & { userData: { parts: number[] } };

/** One mesh for the buildings of a chunk; each building's first vertex and count kept for folding. */
export function buildingsMesh(
  list: Footprint[],
  height: (x: number, z: number) => number,
  material: THREE.Material,
): Buildings | null {
  if (list.length === 0) return null;
  const w = new Writer();
  const parts: number[] = [];
  for (const b of list) {
    const start = w.count;
    write(w, b, height);
    parts.push(b.x, b.z, start, w.count - start);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(w.positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(w.colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material) as unknown as Buildings;
  mesh.userData.parts = parts;
  return mesh;
}

/** Folds away every building of the mesh within `r` metres of a place: its triangles are made points. */
export function foldAround(mesh: Buildings, x: number, z: number, r: number): void {
  const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
  const parts = mesh.userData.parts;
  let changed = false;
  for (let k = 0; k < parts.length; k += 4) {
    if (Math.hypot(parts[k]! - x, parts[k + 1]! - z) > r) continue;
    const start = parts[k + 2]!;
    const count = parts[k + 3]!;
    for (let i = start; i < start + count; i++) position.setXYZ(i, parts[k]!, -1000, parts[k + 1]!);
    changed = true;
  }
  if (changed) position.needsUpdate = true;
}
