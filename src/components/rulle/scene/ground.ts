import type { Course, Land } from "@/modules/rulle";
import { coverPatch, fieldColor, type Patch } from "./land-cover";
import { hash, hills, smoothstep } from "./noise";
import { PALETTE } from "./palette";
import { RoadGrid, type Nearest } from "./road-grid";

/**
 * The ground the route runs through, as a function of place: its height,
 * and what covers it. Near the road it is the road's height (a road lies
 * on its ground). Further out, on a route that comes with Kadence, it is
 * the real land (ADR 0035): the height model's heights, lakes at their
 * level, and the woods, fields, meadows and towns OpenStreetMap has
 * there. On any other route the road's own heights are the only survey
 * there is, and the land is made from them: a smooth surface drawn
 * through them, with rolling swells laid over it that grow away from the
 * road, and a patchwork of fields, woods and pasture. Either way, where
 * the land dips below the sea there is water — the fjord beside the shore
 * road.
 *
 * World coordinates are three.js's: x east, y up, z south (so a course's
 * north, and the land's, is -z).
 */

export type { Patch } from "./land-cover";

/** Half the road's width, metres: a Danish country road. */
export const ROAD_HALF = 3;
/** The grass verge beyond the asphalt, metres, falling from the road to the land. */
export const VERGE = 7;
/**
 * The land lies at the road's height this far from it, and is its own
 * beyond `FREE_AT` — sooner on the real land, whose heights are surveyed
 * and need less room to meet the road's.
 */
const FLAT_TO = 18;
const FREE_AT = 75;
const FREE_AT_REAL = 50;
const PATCH = 150;
const REACH = 300;
/** Metres between the corners of the terrain's triangles. */
export const GRID = 25;
/** How far below its surface the bed of a lake is drawn. */
const LAKE_DEPTH = 0.8;
/** Corner heights remembered before the memory is let go and started again. */
const REMEMBERED = 120_000;

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

/**
 * A city street's side (ADR 0036), outward from the asphalt's edge: a kerb,
 * the cycle track, a second kerb, the pavement, and down to the land.
 * Metres out and metres above the asphalt.
 */
export const STREET = {
  kerb: 0.15,
  track: 2,
  trackLift: 0.1,
  pavement: 5,
  pavementLift: 0.16,
} as const;

/**
 * The ground below the road's surface `off` metres from its middle, where
 * the land is `sunk` below it: the grass verge falling to the land, or in
 * a city the kerbs, the cycle track and the pavement.
 */
export function groundAt(off: number, sunk: number, city = false): number {
  const out = Math.abs(off) - ROAD_HALF;
  if (out <= 0) return 0;
  if (!city) return 0.01 - (sunk + 0.01) * Math.min(1, out / VERGE);
  const S = STREET;
  if (out <= S.kerb) return (S.trackLift * out) / S.kerb;
  if (out <= S.track) return S.trackLift;
  if (out <= S.track + S.kerb)
    return S.trackLift + ((S.pavementLift - S.trackLift) * (out - S.track)) / S.kerb;
  if (out <= S.pavement) return S.pavementLift;
  return (
    S.pavementLift -
    (S.pavementLift + sunk) * Math.min(1, (out - S.pavement) / (VERGE - S.pavement))
  );
}

export class Ground {
  private readonly road: RoadGrid;
  private base: ReturnType<typeof baseSurface> | null = null;
  private readonly corners = new Map<number, number>();

  constructor(
    readonly course: Course,
    /** The real land round a route that comes with Kadence; null for any other. */
    readonly land: Land | null = null,
    /** A city's streets (ADR 0036): what nobody mapped is paved, not fields. */
    readonly city = false,
  ) {
    this.road = new RoadGrid(course);
  }

  /** The nearest point of the road within about `reach` metres: how far, and how high it is there. */
  nearest(x: number, z: number, reach = REACH): Nearest {
    return this.road.nearest(x, z, reach);
  }

  /** The land's height at a place, metres above the sea. */
  height(x: number, z: number): number {
    const found = this.land?.heightAt(x, -z) ?? null;
    const freeAt = found === null ? FREE_AT : FREE_AT_REAL;
    const road = this.nearest(x, z, found === null ? REACH : freeAt);
    let free: number;
    if (found === null) free = this.baseAt(x, z) + hills(x, z) * smoothstep(FLAT_TO, 260, road.d);
    else {
      // A lake lies at its level, over a bed a little below it.
      const level = this.land!.waterAt(x, -z);
      free = level === null ? found : Math.min(found, level - LAKE_DEPTH);
    }
    if (road.d === Infinity) return free;
    const w = smoothstep(FLAT_TO, freeAt, road.d);
    return (road.ele - sink(this.course, road.index)) * (1 - w) + free * w;
  }

  /** The height at a corner of the terrain's triangles, `GRID` metres apart: worked out once. */
  corner(a: number, b: number): number {
    const key = a * 262_144 + b;
    let h = this.corners.get(key);
    if (h === undefined) {
      if (this.corners.size >= REMEMBERED) this.corners.clear();
      h = this.height(a * GRID, b * GRID);
      this.corners.set(key, h);
    }
    return h;
  }

  /** What covers the land here. */
  patch(x: number, z: number): Patch {
    if (this.land) {
      const cover = this.land.coverAt(x, -z);
      if (cover) return coverPatch(cover.kind, cover.id, this.city);
      // Land no one has mapped: in a city streets and squares; in the country
      // fields, and no woods made up in the real country.
      if (this.land.heightAt(x, -z) !== null)
        return this.city ? coverPatch("town", 0, true) : this.madeUp(x, z, false);
    }
    return this.madeUp(x, z, true);
  }

  /** The surface of a lake or a river here, metres above the sea; null where there is none. */
  lake(x: number, z: number): number | null {
    return this.land?.waterAt(x, -z) ?? null;
  }

  /** Whether there is water here: a lake, a river, or the sea. */
  wet(x: number, z: number): boolean {
    if (this.lake(x, z) !== null) return true;
    return (this.land?.heightAt(x, -z) ?? this.height(x, z)) < 0.25;
  }

  /** Where a herd may graze: a field or a meadow, not a wood, a garden or a lake; none in a city. */
  grazing(x: number, z: number): boolean {
    if (this.city) return false;
    if (!this.land) return true;
    const kind = this.patch(x, z).kind;
    return (kind === "field" || kind === "pasture" || kind === "meadow") && !this.wet(x, z);
  }

  /** The made-up patchwork: fields, pasture and, where `woods`, a wood now and then. */
  private madeUp(x: number, z: number, woods: boolean): Patch {
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
    if (woods && roll < 0.13) return coverPatch("forest", id);
    if (roll < 0.3) return { kind: "pasture", color: PALETTE.fields[0]!, id };
    return { kind: "field", color: fieldColor(id), id };
  }

  private baseAt(x: number, z: number): number {
    this.base ??= baseSurface(this.course);
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
