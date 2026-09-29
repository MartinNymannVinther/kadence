import type { Course } from "@/modules/rulle";
import { hash, hills, smoothstep } from "./noise";
import { PALETTE } from "./palette";

/**
 * The ground the route runs through, as a function of place: its height,
 * and which field, wood or pasture covers it. The route's own heights are
 * the only survey there is, so the land is made from them: near the road
 * it is the road's height (a road lies on its ground), further out a
 * smooth surface drawn through the road's heights, with rolling swells
 * laid over it that grow away from the road. Where the land dips below
 * the sea, there is water — the fjord beside the shore road.
 *
 * World coordinates are three.js's: x east, y up, z south (so a course's
 * north is -z).
 */

/** Half the road's width, metres: a Danish country road. */
export const ROAD_HALF = 3;
/** The grass verge beyond the asphalt, metres, falling from the road to the land. */
export const VERGE = 7;
/** The land lies at the road's height this far from it, and is its own beyond `FREE_AT`. */
const FLAT_TO = 18;
const FREE_AT = 75;
const CELL = 100;
const PATCH = 150;
const REACH = 300;

export type Patch = { kind: "field" | "forest" | "pasture"; color: string; id: number };

/**
 * How far the land beside the road lies below it, metres: a little on
 * the flat, more where the road climbs steeply. The land is drawn on a
 * grid far coarser than the road, and where a flat road turns into a
 * steep one the straight edge of a grid triangle would otherwise pass
 * over the asphalt; lying lower there, the land never covers the road,
 * and the verge falls to meet it like an embankment.
 */
export function sink(course: Course, index: number): number {
  const n = course.grade.length;
  let steepest = 0;
  for (let k = -4; k <= 4; k++)
    steepest = Math.max(steepest, Math.abs(course.grade[(((index + k) % n) + n) % n]!));
  return Math.min(2.4, 0.35 + 12 * steepest);
}

/** The ground below the road's surface `off` metres from its middle, where the land is `sunk` below it. */
export function groundAt(off: number, sunk: number): number {
  const out = Math.abs(off) - ROAD_HALF;
  if (out <= 0) return 0;
  return 0.01 - (sunk + 0.01) * Math.min(1, out / VERGE);
}

export class Ground {
  private readonly cells = new Map<string, number[]>();
  private readonly base: {
    x0: number;
    z0: number;
    step: number;
    nx: number;
    nz: number;
    h: Float32Array;
  };

  constructor(readonly course: Course) {
    const n = course.x.length;
    for (let i = 0; i < n; i++) {
      const key = `${Math.floor(course.x[i]! / CELL)},${Math.floor(-course.y[i]! / CELL)}`;
      const list = this.cells.get(key);
      if (list) list.push(i);
      else this.cells.set(key, [i]);
    }
    this.base = baseSurface(course);
  }

  /** The nearest point of the road: how far, and how high it is there. */
  nearest(x: number, z: number): { d: number; ele: number; index: number } {
    const cx = Math.floor(x / CELL);
    const cz = Math.floor(z / CELL);
    const r = Math.ceil(REACH / CELL);
    let best = Infinity;
    let index = -1;
    for (let i = cx - r; i <= cx + r; i++)
      for (let j = cz - r; j <= cz + r; j++) {
        const list = this.cells.get(`${i},${j}`);
        if (!list) continue;
        for (const k of list) {
          const dx = this.course.x[k]! - x;
          const dz = -this.course.y[k]! - z;
          const d = dx * dx + dz * dz;
          if (d < best) {
            best = d;
            index = k;
          }
        }
      }
    return index < 0
      ? { d: Infinity, ele: 0, index: -1 }
      : { d: Math.sqrt(best), ele: this.course.ele[index]!, index };
  }

  /** The land's height at a place, metres above the sea. */
  height(x: number, z: number): number {
    const road = this.nearest(x, z);
    const free = this.baseAt(x, z) + hills(x, z) * smoothstep(FLAT_TO, 260, road.d);
    if (road.d === Infinity) return free;
    const w = smoothstep(FLAT_TO, FREE_AT, road.d);
    return (road.ele - sink(this.course, road.index)) * (1 - w) + free * w;
  }

  /** What covers the land here: fields in a patchwork, woods, and pasture. */
  patch(x: number, z: number): Patch {
    const cx = Math.floor(x / PATCH);
    const cz = Math.floor(z / PATCH);
    let best = Infinity;
    let id = 0;
    for (let i = cx - 1; i <= cx + 1; i++)
      for (let j = cz - 1; j <= cz + 1; j++) {
        const px = (i + hash(i, j, 1)) * PATCH;
        const pz = (j + hash(i, j, 2)) * PATCH;
        const d = (px - x) ** 2 + (pz - z) ** 2;
        if (d < best) {
          best = d;
          id = (i * 73856093) ^ (j * 19349663);
        }
      }
    const roll = hash(id, 0, 3);
    if (roll < 0.13) return { kind: "forest", color: PALETTE.forestFloor, id };
    const fields = PALETTE.fields;
    if (roll < 0.3) return { kind: "pasture", color: fields[0]!, id };
    return { kind: "field", color: fields[Math.floor(hash(id, 1, 4) * fields.length)]!, id };
  }

  private baseAt(x: number, z: number): number {
    const { x0, z0, step, nx, nz, h } = this.base;
    const fx = Math.min(nx - 1.001, Math.max(0, (x - x0) / step));
    const fz = Math.min(nz - 1.001, Math.max(0, (z - z0) / step));
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const u = fx - i;
    const v = fz - j;
    const at = (a: number, b: number) => h[b * nx + a]!;
    return (
      at(i, j) * (1 - u) * (1 - v) +
      at(i + 1, j) * u * (1 - v) +
      at(i, j + 1) * (1 - u) * v +
      at(i + 1, j + 1) * u * v
    );
  }
}

/**
 * A coarse surface through the road's heights, weighted by the inverse
 * square of the distance: what the land away from the road rises and
 * falls around. A few hundred samples of the road, a grid of at most
 * 150 by 150; computed once, when the ride begins.
 */
function baseSurface(course: Course) {
  const n = course.x.length;
  const stride = Math.max(1, Math.ceil(n / 700));
  const xs: number[] = [];
  const zs: number[] = [];
  const hs: number[] = [];
  for (let i = 0; i < n; i += stride) {
    xs.push(course.x[i]!);
    zs.push(-course.y[i]!);
    hs.push(course.ele[i]!);
  }
  const margin = 3000;
  const minX = Math.min(...xs) - margin;
  const maxX = Math.max(...xs) + margin;
  const minZ = Math.min(...zs) - margin;
  const maxZ = Math.max(...zs) + margin;
  const step = Math.max(150, Math.max(maxX - minX, maxZ - minZ) / 150);
  const nx = Math.ceil((maxX - minX) / step) + 1;
  const nz = Math.ceil((maxZ - minZ) / step) + 1;
  const h = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const x = minX + i * step;
      const z = minZ + j * step;
      let sum = 0;
      let weight = 0;
      for (let k = 0; k < xs.length; k++) {
        const d2 = (xs[k]! - x) ** 2 + (zs[k]! - z) ** 2 + 400 ** 2;
        const w = 1 / d2;
        sum += w * hs[k]!;
        weight += w;
      }
      h[j * nx + i] = sum / weight;
    }
  return { x0: minX, z0: minZ, step, nx, nz, h };
}
