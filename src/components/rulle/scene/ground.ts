import { inside, type City, type Course, type Land, type Stretch } from "@/modules/rulle";
import { GRID } from "./grid-triangle";
import { coverPatch, fieldColor, type Patch } from "./land-cover";
import { hash, hills, smoothstep } from "./noise";
import { PALETTE } from "./palette";
import { clearedCorners, cornerKey } from "./road-clear";
import { RoadGrid, type Nearest } from "./road-grid";
import { sink } from "./road-profile";

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
 * road. Under a bridge the road is on (ADR 0037) the land is left as it
 * lies, and never higher than a little below the deck. Where the land is
 * drawn, in triangles, its corners by the road are lowered so that no
 * triangle passes over the asphalt (`road-clear.ts`, ADR 0108).
 *
 * World coordinates are three.js's: x east, y up, z south (so a course's
 * north, and the land's, is -z).
 */

export type { Patch } from "./land-cover";
export { GRID } from "./grid-triangle";
export { BRIDGE, groundAt, ROAD_HALF, sink, STREET, VERGE } from "./road-profile";

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
/** How far below its surface the bed of a lake is drawn. */
const LAKE_DEPTH = 0.8;
/** Under a bridge the land lies at least this far below the road. */
const UNDER_DECK = 2.5;
/** Corner heights remembered before the memory is let go and started again. */
const REMEMBERED = 120_000;

export class Ground {
  private readonly road: RoadGrid;
  private base: ReturnType<typeof baseSurface> | null = null;
  private readonly corners = new Map<number, number>();
  /** The corners near the road, lowered so the land never covers it; worked out at the first corner asked. */
  private cleared: Map<number, number> | null = null;

  constructor(
    readonly course: Course,
    /** The real land round a route that comes with Kadence; null for any other. */
    readonly land: Land | null = null,
    /** A city's streets (ADR 0036): what nobody mapped is paved, not fields. */
    readonly city: City | null = null,
    /** Where the road is on a bridge (ADR 0037): no verge, and the land left under it. */
    readonly decks: readonly Stretch[] = [],
  ) {
    this.road = new RoadGrid(course);
  }

  /** Whether the road is on a bridge `along` metres into the lap. */
  onDeck(along: number): boolean {
    return this.decks.some((d) => inside(d, along, this.course.length));
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
    // Under a bridge the land lies as it lies: the river, the road below.
    if (this.decks.length > 0 && this.onDeck(road.index * this.course.step))
      return Math.min(free, road.ele - sink(this.course, road.index) - UNDER_DECK);
    const w = smoothstep(FLAT_TO, freeAt, road.d);
    return (road.ele - sink(this.course, road.index)) * (1 - w) + free * w;
  }

  /**
   * The height at a corner of the terrain's triangles, `GRID` metres apart:
   * worked out once — and near the road, lowered where a triangle would
   * otherwise cover it (`road-clear.ts`, ADR 0108).
   */
  corner(a: number, b: number): number {
    const key = cornerKey(a, b);
    this.cleared ??= clearedCorners(
      this.course,
      { city: this.city !== null, onDeck: (along) => this.onDeck(along) },
      (i, j) => this.height(i * GRID, j * GRID),
    );
    const lowered = this.cleared.get(key);
    if (lowered !== undefined) return lowered;
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
      if (cover) return coverPatch(cover.kind, cover.id, this.city !== null);
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
