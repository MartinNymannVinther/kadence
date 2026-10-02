import type { BuildingKind, RoofShape } from "@/modules/rulle";
import type { Look } from "./building-look";
import { cityBlock } from "./building-city";
import { block, farm, hall, house, type Plot } from "./building-homes";
import { gable, pyramid, riseOf, roofOf } from "./building-roofs";
import { frontStairs } from "./building-stairs";
import {
  box,
  choose,
  moved,
  walls,
  type Frame,
  type Windows,
  type Writer,
} from "./building-writer";
import { hash } from "./noise";
import { PALETTE } from "./palette";

/**
 * Each building as the land has it (ADR 0035, 0036), written straight into
 * one geometry for a chunk: the rectangle round each footprint, walls as
 * high as its storeys — or its height where the map says it, from where it
 * starts (a spire on a tower) — a roof of the shape the map says, or else
 * a gabled one on a house or a farm and a flat one on a hall or some
 * blocks of flats; a church's nave with its tower to the west; a chimney;
 * windows in rows. The colours come from the building's own number:
 * whitewashed, yellow or red brick, under red tiles, black or grey — or
 * the roof's colour the map gives. A city builds its own way (ADR 0036):
 * Copenhagen's churches under green copper; Montréal's plexes in red and
 * brown brick and grey stone, their churches under tin, and stairs up
 * the front to the floor above.
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
  /** The nearest point of the road: the way its front faces. */
  road?: { x: number; z: number } | null;
};

/** Stairs outside on a building this close to the road, of these storeys. */
const STAIRS_WITHIN = 150;

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

function church(
  w: Writer,
  f: Frame,
  L: number,
  S: number,
  bottom: number,
  high: number,
  roof: string,
): void {
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
  gable(w, nave, naveL, naveS, high + 7, naveS * 0.55, PALETTE.wall, roof);
  const towerAt = west * (L / 2 - T / 2);
  box(w, f, towerAt, 0, T, T, bottom, high + 17, PALETTE.tower);
  pyramid(w, moved(f, towerAt, 0), T, T, high + 17, high + 22, roof);
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
  look: Look,
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
      : choose(look.blockWalls, [0.45, 0.3, 0.25], r(1));
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

/** Writes a building standing on the land, whose height at a place is `height`, as its city builds. */
export function write(
  w: Writer,
  b: Footprint,
  height: (x: number, z: number) => number,
  storeys: Storeys,
  look: Look,
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
  // A plain block whose height the map says is, in a big city, built as the city builds.
  const plain =
    look.big && (b.kind === "house" || b.kind === "block") && !b.minHeight && (b.height ?? 0) <= 30;
  if (b.height && b.height > 0 && !(plain && b.height >= 9))
    return measured(w, b, f, L, S, bottom, high, r, win, look);
  const told = b.height ? Math.max(3, Math.round((b.height - 3) / 3.2)) : 0;
  const levels = told || (b.levels > 0 ? b.levels : storeys(b));
  const said = b.roof && b.roof !== "unsaid" ? b.roof : null;
  const tint = (fallback: string) => (b.roofColour != null ? hex(b.roofColour) : fallback);
  // A plex's stairs up the front, the one facing the road, to the floor above; not on every one.
  const stairs = (storey: number, rows: number) => {
    if (look.stairs && b.road && far <= STAIRS_WITHIN && rows >= 2 && rows <= 4 && r(6) < 0.75)
      frontStairs(w, f, L, S, b.road, high, storey, PALETTE.stairs);
  };
  const road = b.road ?? null;
  // A big city's block: of three storeys or more, in the city's way (ADR 0045).
  if (look.big && (b.kind === "house" || b.kind === "block") && levels >= 3) {
    const plot = { f, L, S, bottom, high, levels, said, r, win, look, tint, road, far };
    return cityBlock(w, plot);
  }
  const plot: Plot = { w, b, f, L, S, bottom, high, levels, said, r, win, look, tint, stairs };
  switch (b.kind) {
    case "church":
      return church(w, f, L, S, bottom, high, look.churchRoof);
    case "big":
    case "part":
      return hall(plot);
    case "block":
      return block(plot);
    case "farm":
      return farm(plot);
    case "house":
      return house(plot);
  }
}
