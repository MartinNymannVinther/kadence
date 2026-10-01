import { z } from "zod";

/**
 * The land file's format (ADR 0035): what `scripts/rulle-land.ts` writes
 * beside a route's GPX file and `readLand` (`land.ts`) reads. Kinds are
 * kept by their number in these lists, so a kind is only ever added at
 * the end. Pure.
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
  /**
   * The roads round the route (ADR 0045), widest first: a main road, a
   * minor one or a town's street, a service road or a drive, a farm
   * track, a cycle path, a footpath.
   */
  roads: ["main", "minor", "service", "track", "cycle", "foot"],
} as const;

export type AreaKind = (typeof LAND_KINDS.areas)[number];
export type LineKind = (typeof LAND_KINDS.lines)[number];
export type BuildingKind = (typeof LAND_KINDS.buildings)[number];
export type RoofShape = (typeof LAND_KINDS.roofs)[number];
export type StructureKind = (typeof LAND_KINDS.structures)[number];
export type RoadKind = (typeof LAND_KINDS.roads)[number];

/** How far from the road a land file's buildings reach when it does not say (ADR 0035). */
export const MAPPED = 700;

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
  /**
   * The roads round the route but the route's own (ADR 0045): their kind,
   * whether they are unpaved (1) or not (0), and their line.
   */
  roads: z
    .array(z.tuple([z.number().int().min(0), z.number().int().min(0).max(1), flat]))
    .max(30_000)
    .default([]),
  /**
   * How far from the road, metres, every building the map has is in the
   * file; beyond it the landscape makes them up (ADR 0045). A file that
   * does not say has them out to `MAPPED`.
   */
  reach: z.number().positive().max(10_000).default(MAPPED),
});

/** A land file as it is written: what the script makes, and `readLand` reads. */
export type LandFile = z.input<typeof landFileSchema>;
