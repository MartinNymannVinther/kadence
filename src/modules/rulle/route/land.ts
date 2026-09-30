import { z } from "zod";
import type { Course } from "./course";

/**
 * The land around a route that comes with Kadence (ADR 0035): the
 * ground's heights from a height model, and what covers it — woods,
 * water, fields, meadows, towns, their buildings, tree rows, hedges, wind
 * turbines — from OpenStreetMap, fetched once by `scripts/rulle-land.ts`
 * and kept beside the route's GPX file. In metres on the course's own
 * plane (x east, y north), and read only for the course it was made for:
 * a file made for another is no land at all. Pure.
 */

export const LAND_KINDS = {
  /**
   * In the order they are laid: a later kind over an earlier where both
   * claim a place. A wood is "forest" (broadleaved or mixed, or not said)
   * or "conifer" (needleleaved).
   */
  areas: [
    "field",
    "meadow",
    "orchard",
    "yard",
    "town",
    "industry",
    "heath",
    "sand",
    "wetland",
    "forest",
    "conifer",
    "water",
    // Added later, so laid last: a file keeps its kinds' numbers.
    "cemetery",
  ],
  lines: ["river", "stream", "trees", "hedge"],
  /** A "part" is a piece of a building drawn on its own: a tower, a spire, a dome. */
  buildings: ["house", "farm", "big", "block", "church", "part"],
  /** A roof's shape where the map says it; "unsaid" leaves it to the building's kind. */
  roofs: ["unsaid", "flat", "gabled", "hipped", "pyramidal", "dome", "skillion", "mansard"],
  /**
   * What a bridge or a tunnel by the route carries (ADR 0037): a road, a
   * motorway, a path, a railway, water, or a wildlife crossing's green.
   */
  structures: ["road", "motorway", "path", "rail", "water", "green"],
} as const;

export type AreaKind = (typeof LAND_KINDS.areas)[number];
export type LineKind = (typeof LAND_KINDS.lines)[number];
export type BuildingKind = (typeof LAND_KINDS.buildings)[number];
export type RoofShape = (typeof LAND_KINDS.roofs)[number];
export type StructureKind = (typeof LAND_KINDS.structures)[number];

const flat = z.array(z.number().finite()).max(200_000);

export const landFileSchema = z.object({
  version: z.literal(1),
  origin: z.object({ lat: z.number(), lon: z.number() }),
  fetched: z.string().max(40),
  heights: z.object({
    x0: z.number(),
    y0: z.number(),
    step: z.number().positive(),
    cols: z.number().int().positive().max(2000),
    rows: z.number().int().positive().max(2000),
    dm: z.string().max(12_000_000),
  }),
  areas: z.array(z.tuple([z.number().int().min(0), flat]).rest(flat)).max(60_000),
  lines: z.array(z.tuple([z.number().int().min(0), flat])).max(60_000),
  /**
   * A building: its middle, its sides, its turn, its kind and storeys; and
   * where the map says them, its height and the height it starts at (a
   * spire on a tower), metres, its roof's shape and the roof's colour
   * (0xRRGGBB, or -1).
   */
  buildings: z
    .array(
      z
        .tuple([
          z.number(),
          z.number(),
          z.number(),
          z.number(),
          z.number(),
          z.number().int(),
          z.number().int(),
        ])
        .rest(z.number()),
    )
    .max(100_000),
  turbines: z.array(z.tuple([z.number(), z.number()])).max(5_000),
  /** Single trees the map has, by the road: a city's street trees. */
  trees: z
    .array(z.tuple([z.number(), z.number()]))
    .max(50_000)
    .default([]),
  /** The cobbled streets the route runs along (ADR 0036), as lines. */
  setts: z.array(flat).max(2_000).default([]),
  /**
   * The bridges and tunnels along the route and across it (ADR 0037): what
   * each carries, whether it is a bridge (1) or a tunnel (2), and its line.
   */
  structures: z
    .array(z.tuple([z.number().int().min(0), z.number().int().min(1).max(3), flat]))
    .max(5_000)
    .default([]),
});

/** A land file as it is written: what the script makes, and `readLand` reads. */
export type LandFile = z.input<typeof landFileSchema>;

type XY = { x: number; y: number };

export type Land = {
  /** The model's height at a place, metres above the sea; null outside the land. */
  heightAt(x: number, y: number): number | null;
  /** What covers a place, and which area it is (a field its own colour); null where nothing is mapped. */
  coverAt(x: number, y: number): { kind: AreaKind; id: number } | null;
  /** The surface of the lake or river at a place, above the sea; null where there is none. */
  waterAt(x: number, y: number): number | null;
  lines: { kind: LineKind; points: XY[] }[];
  buildings: {
    x: number;
    y: number;
    w: number;
    d: number;
    angle: number;
    kind: BuildingKind;
    levels: number;
    /** Metres, where the map says: to the top, and where it starts. */
    height: number | null;
    minHeight: number;
    roof: RoofShape;
    /** 0xRRGGBB, where the map says. */
    roofColour: number | null;
  }[];
  turbines: XY[];
  trees: XY[];
  /** The cobbled streets the route runs along. */
  setts: XY[][];
  /** The bridges and tunnels along the route and across it. */
  structures: { kind: StructureKind; bridge: boolean; tunnel: boolean; points: XY[] }[];
  /** Every area, its outline first and its holes after: what a farmyard or a town is, where. */
  areas: { kind: AreaKind; id: number; rings: XY[][] }[];
  /** Lakes and rivers above the sea, with the level their water lies at. */
  waters: { rings: XY[][]; level: number }[];
};

/** Metres of each cell of what covers the land. */
export const COVER_CELL = 10;
/**
 * A lake lies at least this far below the road beside it (within
 * `BANK_REACH` metres): a height model blurs the water into the road
 * along a causeway, and the road is the course's to say.
 */
export const BANK = 0.9;
const BANK_REACH = 30;

const points = (values: number[]): XY[] => {
  const out: XY[] = [];
  for (let i = 0; i + 1 < values.length; i += 2) out.push({ x: values[i]!, y: values[i + 1]! });
  return out;
};

function decode(base64: string): Int16Array {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
}

export function readLand(json: unknown, course: Course): Land | null {
  const parsed = landFileSchema.safeParse(json);
  if (!parsed.success) return null;
  const file = parsed.data;
  // Made for this course, or not at all.
  if (Math.abs(file.origin.lat - course.origin.lat) > 1e-7) return null;
  if (Math.abs(file.origin.lon - course.origin.lon) > 1e-7) return null;
  const h = file.heights;
  const dm = decode(h.dm);
  if (dm.length < h.cols * h.rows) return null;

  const heightAt = (x: number, y: number): number | null => {
    const fx = (x - h.x0) / h.step;
    const fy = (y - h.y0) / h.step;
    if (fx < 0 || fy < 0 || fx > h.cols - 1 || fy > h.rows - 1) return null;
    const i = Math.min(h.cols - 2, Math.floor(fx));
    const j = Math.min(h.rows - 2, Math.floor(fy));
    const u = fx - i;
    const v = fy - j;
    const at = (a: number, b: number) => dm[b * h.cols + a]! / 10;
    return (
      at(i, j) * (1 - u) * (1 - v) +
      at(i + 1, j) * u * (1 - v) +
      at(i, j + 1) * (1 - u) * v +
      at(i + 1, j + 1) * u * v
    );
  };

  // What covers the land, laid in kind order on a grid of COVER_CELL metres.
  const width = (h.cols - 1) * h.step;
  const height = (h.rows - 1) * h.step;
  const gw = Math.ceil(width / COVER_CELL);
  const gh = Math.ceil(height / COVER_CELL);
  const kinds = new Uint8Array(gw * gh);
  const ids = new Uint16Array(gw * gh);
  const areas = file.areas
    .map(([kind, ...rings], index) => ({ kind, rings: rings.map(points), index }))
    .filter((a) => a.kind < LAND_KINDS.areas.length)
    .sort((a, b) => a.kind - b.kind);
  const WATER = LAND_KINDS.areas.indexOf("water");
  const levels = new Map<number, number>();
  for (const area of areas) {
    if (area.kind === WATER) {
      // Its shore's lowest point: the model's heights over water are its surface.
      const shore = area.rings[0]!.map((p) => heightAt(p.x, p.y) ?? 0);
      levels.set(area.index % 65536, Math.max(0, Math.min(...shore)));
    }
    fill(area.rings, (cx, cy) => {
      const k = cy * gw + cx;
      kinds[k] = area.kind + 1;
      ids[k] = area.index % 65536;
    });
  }
  // No lake above the road beside it.
  const reach = Math.ceil(BANK_REACH / COVER_CELL);
  for (let i = 0; i < course.x.length; i++) {
    const cx = Math.floor((course.x[i]! - h.x0) / COVER_CELL);
    const cy = Math.floor((course.y[i]! - h.y0) / COVER_CELL);
    for (let dy = -reach; dy <= reach; dy++)
      for (let dx = -reach; dx <= reach; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= gw || y >= gh || kinds[y * gw + x] !== WATER + 1) continue;
        const id = ids[y * gw + x]!;
        const level = levels.get(id)!;
        levels.set(id, Math.max(0, Math.min(level, course.ele[i]! - BANK)));
      }
  }
  const waters: Land["waters"] = [];
  for (const area of areas) {
    const level = area.kind === WATER ? levels.get(area.index % 65536)! : 0;
    if (level > 0.5) waters.push({ rings: area.rings, level });
  }

  function fill(rings: XY[][], set: (cx: number, cy: number) => void): void {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of rings[0]!) {
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const from = Math.max(0, Math.floor((minY - h.y0) / COVER_CELL));
    const to = Math.min(gh - 1, Math.ceil((maxY - h.y0) / COVER_CELL));
    const crossings: number[] = [];
    for (let cy = from; cy <= to; cy++) {
      const y = h.y0 + (cy + 0.5) * COVER_CELL;
      crossings.length = 0;
      for (const ring of rings)
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i]!;
          const b = ring[(i + 1) % ring.length]!;
          if (a.y <= y === b.y <= y) continue;
          crossings.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
        }
      crossings.sort((p, q) => p - q);
      for (let c = 0; c + 1 < crossings.length; c += 2) {
        const x0 = Math.max(0, Math.ceil((crossings[c]! - h.x0) / COVER_CELL - 0.5));
        const x1 = Math.min(gw - 1, Math.floor((crossings[c + 1]! - h.x0) / COVER_CELL - 0.5));
        for (let cx = x0; cx <= x1; cx++) set(cx, cy);
      }
    }
  }

  const cell = (x: number, y: number) => {
    const cx = Math.floor((x - h.x0) / COVER_CELL);
    const cy = Math.floor((y - h.y0) / COVER_CELL);
    return cx < 0 || cy < 0 || cx >= gw || cy >= gh ? -1 : cy * gw + cx;
  };

  return {
    heightAt,
    coverAt(x, y) {
      const k = cell(x, y);
      if (k < 0 || kinds[k] === 0) return null;
      return { kind: LAND_KINDS.areas[kinds[k]! - 1]!, id: ids[k]! };
    },
    waterAt(x, y) {
      const k = cell(x, y);
      if (k < 0 || LAND_KINDS.areas[kinds[k]! - 1] !== "water") return null;
      return levels.get(ids[k]!) ?? 0;
    },
    lines: file.lines
      .filter(([kind]) => kind < LAND_KINDS.lines.length)
      .map(([kind, values]) => ({ kind: LAND_KINDS.lines[kind]!, points: points(values) })),
    buildings: file.buildings
      .filter((b) => b[5] >= 0 && b[5] < LAND_KINDS.buildings.length)
      .map(
        ([x, y, w, d, angle, kind, levels, height = 0, minHeight = 0, roof = 0, colour = -1]) => ({
          x,
          y,
          w,
          d,
          angle,
          kind: LAND_KINDS.buildings[kind]!,
          levels,
          height: height > 0 ? height : null,
          minHeight: Math.max(0, minHeight),
          roof: LAND_KINDS.roofs[roof] ?? "unsaid",
          roofColour: colour >= 0 ? colour : null,
        }),
      ),
    turbines: file.turbines.map(([x, y]) => ({ x, y })),
    trees: file.trees.map(([x, y]) => ({ x, y })),
    setts: file.setts.map(points),
    structures: file.structures
      .filter(([kind]) => kind < LAND_KINDS.structures.length)
      .map(([kind, flags, values]) => ({
        kind: LAND_KINDS.structures[kind]!,
        bridge: (flags & 1) !== 0,
        tunnel: (flags & 2) !== 0,
        points: points(values),
      })),
    areas: areas.map((a) => ({ kind: LAND_KINDS.areas[a.kind]!, id: a.index, rings: a.rings })),
    waters,
  };
}
