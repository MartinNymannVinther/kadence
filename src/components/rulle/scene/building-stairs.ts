import { at, box, type Frame, type Writer } from "./building-writer";

/**
 * The stairs outside a Montréal plex (ADR 0036): straight and steep up
 * the front, from the pavement to the door of the floor above, with a
 * landing at the top and a railing up the outer edge — iron, dark. In a
 * frame of its own at the wall: `l` along the wall, `s` out from it.
 */

/** How wide a flight is, how far it runs for the storey it climbs, and its landing. */
const WIDE = 1.0;
const RUN = 2.7;
const LANDING = 1.0;
/** A front narrower than this has no room for them. */
const STAIRS_NEED = RUN + LANDING + 0.6;

/**
 * A slab from `l0` at `y0` to `l1` at `y1`, `half` either side of `s`
 * across, `thick` deep below its top: a flight's stringer, or its rail.
 */
function slab(
  w: Writer,
  g: Frame,
  l0: number,
  y0: number,
  l1: number,
  y1: number,
  s: number,
  half: number,
  thick: number,
  hex: string,
): void {
  const top = (l: number, side: number, y: number) => at(g, l, s + side * half, y);
  const low = (l: number, side: number, y: number) => at(g, l, s + side * half, y - thick);
  const [A0, B0, A1, B1] = [top(l0, -1, y0), top(l0, 1, y0), top(l1, -1, y1), top(l1, 1, y1)];
  const [a0, b0, a1, b1] = [low(l0, -1, y0), low(l0, 1, y0), low(l1, -1, y1), low(l1, 1, y1)];
  // Each face counter-clockwise as seen from the side it looks to.
  w.quad(A0, A1, B1, B0, hex);
  w.quad(a0, b0, b1, a1, hex);
  w.quad(b1, b0, B0, B1, hex);
  w.quad(a0, a1, A1, A0, hex);
  w.quad(b0, a0, A0, B0, hex);
  w.quad(a1, b1, B1, A1, hex);
}

/**
 * Stairs up the outside of a building whose front, `front` long, faces
 * the way `out` (a unit vector, x and z) from `middle` at `depth` out:
 * from `ground` up one storey, `rise` metres.
 */
export function outsideStairs(
  w: Writer,
  middle: { x: number; z: number },
  out: { x: number; z: number },
  depth: number,
  ground: number,
  rise: number,
  hex: string,
): void {
  // Along the wall, and out from it: the same way round as a building's own frame.
  const g: Frame = {
    x: middle.x + out.x * (depth + WIDE / 2 + 0.05),
    z: middle.z + out.z * (depth + WIDE / 2 + 0.05),
    lx: -out.z,
    lz: out.x,
    sx: out.x,
    sz: out.z,
  };
  const from = -(RUN + LANDING) / 2;
  const up = from + RUN;
  slab(w, g, from, ground + 0.15, up, ground + rise, 0, WIDE / 2, 0.2, hex);
  box(w, g, up + LANDING / 2, 0, LANDING, WIDE, ground + rise - 0.12, ground + rise, hex);
  // The railing up the outer edge, on a post at each end.
  slab(w, g, from, ground + 1.0, up, ground + rise + 0.95, WIDE / 2 - 0.03, 0.03, 0.06, hex);
  box(w, g, from + 0.03, WIDE / 2 - 0.03, 0.06, 0.06, ground, ground + 1.0, hex);
  box(w, g, up, WIDE / 2 - 0.03, 0.06, 0.06, ground + rise, ground + rise + 0.95, hex);
  // Under the landing, a post down to the pavement.
  box(w, g, up + LANDING - 0.1, WIDE / 2 - 0.1, 0.1, 0.1, ground, ground + rise - 0.12, hex);
}

/**
 * Stairs up the front of a building `L` by `S` in its frame `f`: the side
 * that faces the road at `road`, where it is wide enough for them.
 */
export function frontStairs(
  w: Writer,
  f: Frame,
  L: number,
  S: number,
  road: { x: number; z: number },
  ground: number,
  rise: number,
  hex: string,
): void {
  const tx = road.x - f.x;
  const tz = road.z - f.z;
  const fronts = [
    { x: f.lx, z: f.lz, depth: L / 2, wide: S },
    { x: -f.lx, z: -f.lz, depth: L / 2, wide: S },
    { x: f.sx, z: f.sz, depth: S / 2, wide: L },
    { x: -f.sx, z: -f.sz, depth: S / 2, wide: L },
  ];
  const front = fronts.reduce((a, c) => (c.x * tx + c.z * tz > a.x * tx + a.z * tz ? c : a));
  if (front.wide >= STAIRS_NEED) outsideStairs(w, f, front, front.depth, ground, rise, hex);
}
