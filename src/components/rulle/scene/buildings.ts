import * as THREE from "three";
import type { BuildingKind, RoofShape } from "@/modules/rulle";
import {
  box,
  choose,
  gable,
  moved,
  pyramid,
  riseOf,
  roofOf,
  walls,
  Writer,
  type Frame,
  type Windows,
} from "./building-writer";
import { hash } from "./noise";
import { PALETTE } from "./palette";

/**
 * Buildings as the land has them (ADR 0035, 0036), written straight into
 * one geometry for a chunk: the rectangle round each footprint, walls as
 * high as its storeys — or its height where the map says it, from where it
 * starts (a spire on a tower) — a roof of the shape the map says, or else
 * a gabled one on a house or a farm and a flat one on a hall or some
 * blocks of flats; a church's nave with its tower to the west; a chimney;
 * windows in rows. The colours come from the building's own number:
 * whitewashed, yellow or red brick, under red tiles, black or grey — or
 * the roof's colour the map gives. What a stop needs room for is folded
 * away.
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
  /** Storeys; 0 where the map does not say. */
  levels: number;
  seed: number;
  /** Metres to the top and where it starts, where the map says. */
  height?: number | null;
  minHeight?: number;
  roof?: RoofShape;
  roofColour?: number | null;
  /** Metres from the road: far off, windows are too small to be worth drawing. */
  far?: number;
};

/** Windows this close to the road, and their frames this close. */
const WINDOWS_WITHIN = 200;
const FRAMES_WITHIN = 90;

/** How many storeys a building the map gives none has: in a city, as many as its neighbours. */
export type Storeys = (b: Footprint) => number;

const hex = (colour: number) => `#${colour.toString(16).padStart(6, "0")}`;

/** Its own frame, and its length and width. */
function frameOf(b: Footprint): { f: Frame; L: number; S: number } {
  // The long side's way, and across it, in world coordinates (z is south, so the turn's sine flips).
  const ux = Math.cos(b.angle);
  const uz = -Math.sin(b.angle);
  const long = b.w >= b.d;
  const lx = long ? ux : uz;
  const lz = long ? uz : -ux;
  // Across it to the left, seen from above: the corners then go round counter-clockwise.
  const f: Frame = { x: b.x, z: b.z, lx, lz, sx: lz, sz: -lx };
  return { f, L: long ? b.w : b.d, S: long ? b.d : b.w };
}

function church(w: Writer, f: Frame, L: number, S: number, bottom: number, high: number): void {
  // The tower at the west end, the nave east of it.
  const west = f.lx > 0 ? -1 : 1;
  const T = Math.min(S * 1.05, 8.5);
  const nave = moved(f, -west * (T / 2), 0);
  const naveL = Math.max(8, L - T);
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
  const towerAt = west * (L / 2 - T / 2);
  box(w, f, towerAt, 0, T, T, bottom, high + 17, PALETTE.tower);
  pyramid(w, moved(f, towerAt, 0), T, T, high + 17, high + 22, PALETTE.roofRed);
}

/** A building whose height the map says: walls from where it starts to its eaves, its roof above. */
function measured(
  w: Writer,
  b: Footprint,
  f: Frame,
  L: number,
  S: number,
  bottom: number,
  high: number,
  r: (salt: number) => number,
  win: (spec: Windows) => Windows | null,
): void {
  const total = b.height!;
  const from = b.minHeight ?? 0;
  const shape: RoofShape = b.roof && b.roof !== "unsaid" ? b.roof : "flat";
  const rise = riseOf(shape, L, S, total - from);
  const eaves = high + total - rise;
  const start = from > 0 ? high + from : bottom;
  const wall =
    b.kind === "part" || b.kind === "big"
      ? choose(PALETTE.hall, [0.5, 0.5], r(1))
      : choose(PALETTE.blockWalls, [0.45, 0.3, 0.25], r(1));
  const roof =
    b.roofColour != null
      ? hex(b.roofColour)
      : shape === "dome" || shape === "pyramidal"
        ? PALETTE.copper
        : PALETTE.flatRoof;
  // A slim thing standing high — a spire, a chimney, a mast — has no windows.
  const slim = Math.max(L, S) < 12 && total > 40;
  const rows = Math.min(60, Math.floor((eaves - start) / 3.1));
  walls(
    w,
    f,
    L,
    S,
    start,
    eaves,
    wall,
    from > 0 || slim
      ? null
      : win({ floor: start, rows, storey: 3.1, spacing: 3, wide: 1.2, tall: 1.4, framed: false }),
  );
  roofOf(w, f, shape, L, S, eaves, rise, wall, roof);
}

/** Writes a building standing on the land, whose height at a place is `height`. */
function write(
  w: Writer,
  b: Footprint,
  height: (x: number, z: number) => number,
  storeys: Storeys,
): void {
  const { f, L, S } = frameOf(b);
  let low = Infinity;
  let high = -Infinity;
  for (const [l, s] of [
    [-L / 2, -S / 2],
    [L / 2, -S / 2],
    [L / 2, S / 2],
    [-L / 2, S / 2],
    [0, 0],
  ] as const) {
    const y = height(f.x + f.lx * l + f.sx * s, f.z + f.lz * l + f.sz * s);
    low = Math.min(low, y);
    high = Math.max(high, y);
  }
  const bottom = low - 0.35;
  const r = (salt: number) => hash(b.seed, salt, 501);
  const far = b.far ?? 0;
  const win = (spec: Windows): Windows | null =>
    far > WINDOWS_WITHIN ? null : { ...spec, framed: spec.framed && far < FRAMES_WITHIN };
  if (b.height && b.height > 0) return measured(w, b, f, L, S, bottom, high, r, win);
  const levels = b.levels > 0 ? b.levels : storeys(b);
  const said = b.roof && b.roof !== "unsaid" ? b.roof : null;
  const tint = (fallback: string) => (b.roofColour != null ? hex(b.roofColour) : fallback);
  switch (b.kind) {
    case "church":
      return church(w, f, L, S, bottom, high);
    case "big":
    case "part": {
      const top = high + Math.max(b.kind === "part" ? 3 : 6.5, 3.6 * levels);
      const wall = choose(PALETTE.hall, [0.6, 0.4], r(1));
      walls(
        w,
        f,
        L,
        S,
        bottom,
        top,
        wall,
        win({
          floor: high + 1.4,
          rows: Math.max(1, levels),
          storey: 3.6,
          spacing: 5.5,
          wide: 2,
          tall: 1.1,
          framed: false,
        }),
      );
      const shape = said ?? "flat";
      roofOf(w, f, shape, L, S, top, riseOf(shape, L, S, top - high), wall, tint(PALETTE.flatRoof));
      return;
    }
    case "block": {
      const rows = levels > 1 ? levels : 3;
      const top = high + 3 * rows + 0.4;
      const wall = choose(PALETTE.blockWalls, [0.45, 0.3, 0.25], r(1));
      walls(
        w,
        f,
        L,
        S,
        bottom,
        top,
        wall,
        win({
          floor: high,
          rows,
          storey: 3,
          spacing: 2.9,
          wide: 1.3,
          tall: 1.35,
          framed: false,
        }),
      );
      const shape = said ?? (r(2) < 0.5 ? "gabled" : "flat");
      const rise = shape === "gabled" ? (S / 2) * 0.6 : riseOf(shape, L, S, top - high);
      const roof = shape === "flat" ? PALETTE.flatRoof : choose(PALETTE.roofs, [0.5, 0.5], r(3));
      roofOf(w, f, shape, L, S, top, rise, wall, tint(roof));
      return;
    }
    case "farm": {
      const top = high + 4.2 + (levels > 1 ? 2.8 * (levels - 1) : 0);
      const walled = [PALETTE.walls[0], PALETTE.walls[2], PALETTE.walls[3]];
      const wall = choose(walled, [0.5, 0.3, 0.2], r(1));
      walls(
        w,
        f,
        L,
        S,
        bottom,
        top,
        wall,
        win({
          floor: high + 0.6,
          rows: 1,
          storey: 3,
          spacing: 6,
          wide: 0.9,
          tall: 0.7,
          framed: false,
        }),
      );
      const roofs = [PALETTE.roofs[3], PALETTE.roofs[1], PALETTE.roofs[0]];
      const shape = said ?? "gabled";
      const rise = said ? riseOf(said, L, S, top - high) : (S / 2) * 0.55;
      roofOf(w, f, shape, L, S, top, rise, wall, tint(choose(roofs, [0.45, 0.3, 0.25], r(3))));
      return;
    }
    case "house": {
      const rows = Math.max(1, levels);
      const top = high + 2.8 * rows + 0.3;
      const wall = choose(PALETTE.walls, [0.35, 0.25, 0.3, 0.1], r(1));
      walls(
        w,
        f,
        L,
        S,
        bottom,
        top,
        wall,
        win({
          floor: high,
          rows,
          storey: 2.8,
          spacing: 3.4,
          wide: 1.05,
          tall: 1.15,
          framed: true,
        }),
      );
      const shape = said ?? "gabled";
      const rise =
        shape === "gabled" ? Math.min((S / 2) * 0.85, 5) : riseOf(shape, L, S, top - high);
      const roof = tint(choose(PALETTE.roofs, [0.45, 0.3, 0.15, 0.1], r(3)));
      roofOf(w, f, shape, L, S, top, rise, wall, roof);
      if (shape === "gabled" && r(4) < 0.6 && L > 7) {
        const chimney = L * (r(5) - 0.5) * 0.5;
        box(w, f, chimney, -0.8, 0.6, 0.6, top + rise * 0.5, top + rise + 0.9, "#8f5643");
      }
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
  storeys: Storeys = () => 1,
): Buildings | null {
  if (list.length === 0) return null;
  const w = new Writer();
  const parts: number[] = [];
  for (const b of list) {
    const start = w.count;
    write(w, b, height, storeys);
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
