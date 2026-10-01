import type { RoofShape } from "@/modules/rulle";
import type { Look } from "./building-look";
import { roofOf } from "./building-roofs";
import {
  at,
  both,
  box,
  choose,
  frontOf,
  onFront,
  walls,
  type Frame,
  type Front,
  type Windows,
  type Writer,
} from "./building-writer";
import { PALETTE as P } from "./palette";

/**
 * A big city's block (ADR 0045), as Copenhagen builds them, and not as a
 * country town does: its storeys taller, in plaster of the city's colours
 * or dark red brick; tall windows in white frames; a cornice under the
 * eaves; a slate mansard with a row of dormers, or a slate gable; and on
 * a street, shops at its foot — big panes, a sign band, an awning on some.
 */

/** Storey heights, metres: the shops' at the foot, the flats' above them. */
const SHOP = 3.8;
const STOREY = 3.2;
/** A block this close to the road has shops along its front. */
const SHOPS_WITHIN = 45;
/** A shop front's bay, metres: its pane and the pier beside it. */
const BAY = 3.4;
/** Metres between dormers along a roof. */
const DORMERS = 3.6;

/** A block as `write` knows it: its frame, its size, where it stands and what the map says. */
export type CityPlot = {
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
  road: { x: number; z: number } | null;
  far: number;
};

export function cityBlock(w: Writer, plot: CityPlot): void {
  const { f, L, S, bottom, high, levels, said, r, win, road, far } = plot;
  const shops = road !== null && far < SHOPS_WITHIN && Math.min(L, S) > 7;
  const foot = shops ? SHOP : STOREY;
  const top = high + foot + STOREY * (levels - 1) + 0.3;
  const wall = choose(plot.look.blockWalls, [0.2, 0.2, 0.15, 0.15, 0.1, 0.12, 0.08], r(1));
  const windows = win({
    floor: shops ? high + foot : high,
    rows: shops ? levels - 1 : levels,
    storey: STOREY,
    spacing: 2.7,
    wide: 1.15,
    tall: 1.75,
    framed: true,
  });
  walls(w, f, L, S, bottom, top, wall, windows);
  if (shops && road) shopfronts(w, f, frontOf(f, L, S, road), high, r);
  // The cornice: a band standing out a little under the eaves.
  box(w, f, 0, 0, L + 0.5, S + 0.5, top - 0.35, top, P.cornice);
  const shape = said ?? (r(2) < 0.65 ? "mansard" : "gabled");
  const rise = shape === "flat" ? 0 : Math.min((S / 2) * 0.9, 3.6);
  const roof = plot.tint(choose(P.slate, [0.4, 0.3, 0.2, 0.1], r(3)));
  roofOf(w, f, shape, L, S, top, rise, wall, roof);
  // Dormers only where the windows are drawn at all: near the road.
  if (windows && rise > 1.5 && (shape === "mansard" || shape === "hipped"))
    dormers(w, f, L, S, top, roof);
}

/** Shops along a front: a pane in each bay, a sign band over them all, and an awning on some. */
function shopfronts(
  w: Writer,
  f: Frame,
  front: Front,
  high: number,
  r: (salt: number) => number,
): void {
  const g = onFront(f, front);
  const bays = Math.floor((front.wide - 1) / BAY);
  if (bays < 1) return;
  const half = (bays * BAY) / 2;
  const face = (l0: number, l1: number, out: number, y0: number, y1: number, hex: string) =>
    both(w, at(g, l0, out, y0), at(g, l1, out, y0), at(g, l1, out, y1), at(g, l0, out, y1), hex);
  for (let k = 0; k < bays; k++) {
    const l0 = -half + k * BAY + 0.4;
    face(l0, l0 + BAY - 0.8, 0.05, high + 0.25, high + 2.7, P.shopGlass);
  }
  face(
    -half,
    half,
    0.06,
    high + 2.9,
    high + 3.45,
    choose(P.signs, [0.3, 0.25, 0.2, 0.15, 0.1], r(8)),
  );
  if (r(9) < 0.4) {
    const awning = choose(P.awnings, [0.3, 0.25, 0.2, 0.15, 0.1], r(10));
    both(
      w,
      at(g, -half, 0.06, high + 2.85),
      at(g, half, 0.06, high + 2.85),
      at(g, half, 1.4, high + 2.45),
      at(g, -half, 1.4, high + 2.45),
      awning,
    );
  }
}

/** A row of dormers along each long side of a mansard, each with its window. */
function dormers(w: Writer, f: Frame, L: number, S: number, top: number, roof: string): void {
  const count = Math.floor((L - 3) / DORMERS);
  for (let k = 0; k < count; k++) {
    const l = -((count - 1) * DORMERS) / 2 + k * DORMERS;
    for (const side of [-1, 1]) {
      const s = side * (S / 2 - 1.2);
      box(w, f, l, s, 1.3, 1.0, top + 0.2, top + 1.7, roof);
      // Its window, on the face that looks out over the street.
      const out = s + side * 0.52;
      both(
        w,
        at(f, l - 0.4, out, top + 0.55),
        at(f, l + 0.4, out, top + 0.55),
        at(f, l + 0.4, out, top + 1.4),
        at(f, l - 0.4, out, top + 1.4),
        P.window,
      );
    }
  }
}
