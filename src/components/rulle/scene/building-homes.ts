import type { RoofShape } from "@/modules/rulle";
import type { Footprint } from "./building-kinds";
import type { Look } from "./building-look";
import { riseOf, roofOf } from "./building-roofs";
import { box, choose, walls, type Frame, type Windows, type Writer } from "./building-writer";
import { PALETTE } from "./palette";

/**
 * The everyday buildings (ADR 0035, 0036), as a country town builds them
 * (ADR 0045): a hall or a part of one; a block of flats in brick, three
 * storeys under a red tiled gable or a flat roof; a farm's long low
 * buildings; and a house — whitewashed, yellow or red brick — under red
 * tiles or black glazed ones, gabled or, now and then, hipped, a chimney
 * on most. A big city's blocks are `building-city.ts`'s.
 */

/** A building as `write` has worked it out: where it stands, how high, and what the map says. */
export type Plot = {
  w: Writer;
  b: Footprint;
  f: Frame;
  L: number;
  S: number;
  bottom: number;
  high: number;
  levels: number;
  said: RoofShape | null;
  r: (salt: number) => number;
  win: (spec: Windows) => Windows | null;
  look: Look;
  tint: (fallback: string) => string;
  /** A plex's stairs up the front (Montréal, ADR 0036). */
  stairs: (storey: number, rows: number) => void;
};

/** A hall, a shed, a part of a building drawn on its own: tall storeys, wide windows, flat. */
export function hall({ w, b, f, L, S, bottom, high, levels, said, r, win, tint }: Plot): void {
  const top = high + Math.max(b.kind === "part" ? 3 : 6.5, 3.6 * levels);
  const wall = choose(PALETTE.hall, [0.6, 0.4], r(1));
  const windows = win({
    floor: high + 1.4,
    rows: Math.max(1, levels),
    storey: 3.6,
    spacing: 5.5,
    wide: 2,
    tall: 1.1,
    framed: false,
  });
  walls(w, f, L, S, bottom, top, wall, windows);
  const shape = said ?? "flat";
  roofOf(w, f, shape, L, S, top, riseOf(shape, L, S, top - high), wall, tint(PALETTE.flatRoof));
}

/** A block of flats: three storeys or what the map says, in brick, gabled or flat. */
export function block(plot: Plot): void {
  const { w, f, L, S, bottom, high, levels, said, r, win, look, tint, stairs } = plot;
  const rows = levels > 1 ? levels : 3;
  const top = high + 3 * rows + 0.4;
  const wall = choose(look.blockWalls, [0.45, 0.3, 0.25], r(1));
  const windows = win({
    floor: high,
    rows,
    storey: 3,
    spacing: 2.9,
    wide: 1.3,
    tall: 1.35,
    framed: false,
  });
  walls(w, f, L, S, bottom, top, wall, windows);
  const shape = said ?? (r(2) < 0.5 ? "gabled" : "flat");
  const rise = shape === "gabled" ? (S / 2) * 0.6 : riseOf(shape, L, S, top - high);
  const roof = shape === "flat" ? PALETTE.flatRoof : choose(PALETTE.roofs, [0.5, 0.5], r(3));
  roofOf(w, f, shape, L, S, top, rise, wall, tint(roof));
  stairs(3, rows);
}

/** A farm's building: long and low, few small windows, a gable of tiles or sheeting. */
export function farm({ w, f, L, S, bottom, high, levels, said, r, win, tint }: Plot): void {
  const top = high + 4.2 + (levels > 1 ? 2.8 * (levels - 1) : 0);
  const walled = [PALETTE.walls[0], PALETTE.walls[2], PALETTE.walls[3]];
  const wall = choose(walled, [0.5, 0.3, 0.2], r(1));
  const windows = win({
    floor: high + 0.6,
    rows: 1,
    storey: 3,
    spacing: 6,
    wide: 0.9,
    tall: 0.7,
    framed: false,
  });
  walls(w, f, L, S, bottom, top, wall, windows);
  const roofs = [PALETTE.roofs[3], PALETTE.roofs[1], PALETTE.roofs[0]];
  const shape = said ?? "gabled";
  const rise = said ? riseOf(said, L, S, top - high) : (S / 2) * 0.55;
  roofOf(w, f, shape, L, S, top, rise, wall, tint(choose(roofs, [0.45, 0.3, 0.25], r(3))));
}

/**
 * A house: as many storeys as the map says, or one; in a country town
 * whitewashed or brick under red tiles or black glazed ones, now and then
 * hipped as the houses of the sixties and seventies are; in a city in its
 * own colours.
 */
export function house(plot: Plot): void {
  const { w, f, L, S, bottom, high, levels, said, r, win, look, tint, stairs } = plot;
  const rows = Math.max(1, levels);
  const top = high + 2.8 * rows + 0.3;
  const wall = look.big
    ? look.walls[Math.floor(r(1) * look.walls.length)]!
    : choose(look.walls, [0.35, 0.25, 0.3, 0.1], r(1));
  const windows = win({
    floor: high,
    rows,
    storey: 2.8,
    spacing: 3.4,
    wide: 1.05,
    tall: 1.15,
    framed: true,
  });
  walls(w, f, L, S, bottom, top, wall, windows);
  const town = !look.big && !look.stairs;
  const shape = said ?? (town && r(7) < 0.3 ? "hipped" : "gabled");
  const rise =
    shape === "gabled"
      ? Math.min((S / 2) * 0.85, 5)
      : shape === "hipped" && !said
        ? Math.min((S / 2) * 0.7, 4)
        : riseOf(shape, L, S, top - high);
  // Red tiles most, black glazed ones on many, slate grey or sheeting on a few.
  const tiles = town
    ? choose(
        [PALETTE.roofs[0], PALETTE.glazed, PALETTE.roofs[1], PALETTE.roofs[3]],
        [0.45, 0.2, 0.2, 0.15],
        r(3),
      )
    : choose(PALETTE.roofs, [0.45, 0.3, 0.15, 0.1], r(3));
  roofOf(w, f, shape, L, S, top, rise, wall, tint(tiles));
  if (shape === "gabled" && r(4) < 0.6 && L > 7) {
    const chimney = L * (r(5) - 0.5) * 0.5;
    box(w, f, chimney, -0.8, 0.6, 0.6, top + rise * 0.5, top + rise + 0.9, "#8f5643");
  }
  stairs(2.8, rows);
}
