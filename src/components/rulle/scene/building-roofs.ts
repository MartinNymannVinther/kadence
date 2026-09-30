import type { RoofShape } from "@/modules/rulle";
import { at, CORNERS, flat, type Frame, type V, type Writer } from "./building-writer";

/**
 * A building's roof (`buildings.ts`), written straight into its geometry:
 * flat, gabled, hipped, a pyramid or a spire, or a dome, as high as its
 * shape rises over the building it is on. In the building's own frame.
 */

/** A gabled roof over a rectangle, its ridge along the length, eaves at `eaves`, `rise` higher at the ridge. */
export function gable(
  w: Writer,
  f: Frame,
  L: number,
  S: number,
  eaves: number,
  rise: number,
  wall: string,
  roof: string,
): void {
  const o = 0.35;
  const low = eaves - o * (rise / (S / 2));
  const ridge = eaves + rise;
  const e = L / 2 + o;
  const t = S / 2 + o;
  w.quad(at(f, -e, -t, low), at(f, e, -t, low), at(f, e, 0, ridge), at(f, -e, 0, ridge), roof);
  w.quad(at(f, e, t, low), at(f, -e, t, low), at(f, -e, 0, ridge), at(f, e, 0, ridge), roof);
  w.tri(at(f, -L / 2, S / 2, eaves), at(f, -L / 2, -S / 2, eaves), at(f, -L / 2, 0, ridge), wall);
  w.tri(at(f, L / 2, -S / 2, eaves), at(f, L / 2, S / 2, eaves), at(f, L / 2, 0, ridge), wall);
}

/** A hipped roof: every side slopes up, to a ridge along the length (or a point on a square). */
export function hipped(
  w: Writer,
  f: Frame,
  L: number,
  S: number,
  eaves: number,
  rise: number,
  roof: string,
): void {
  const r = Math.max(0, L / 2 - S / 2);
  const ridge = eaves + rise;
  const [a, b, c, d] = CORNERS(L, S).map(([l, s]) => at(f, l, s, eaves));
  const back = at(f, -r, 0, ridge);
  const front = at(f, r, 0, ridge);
  w.quad(a!, b!, front, back, roof);
  w.quad(c!, d!, back, front, roof);
  w.tri(b!, c!, front, roof);
  w.tri(d!, a!, back, roof);
}

/** A pyramid over a rectangle, its point `apex` high: a tower's roof, or a spire. */
export function pyramid(
  w: Writer,
  f: Frame,
  L: number,
  S: number,
  eaves: number,
  apex: number,
  roof: string,
): void {
  const tip = at(f, 0, 0, apex);
  const corners = CORNERS(L + 0.3, S + 0.3);
  for (let k = 0; k < 4; k++) {
    const [l0, s0] = corners[k]!;
    const [l1, s1] = corners[(k + 1) % 4]!;
    w.tri(at(f, l0, s0, eaves), at(f, l1, s1, eaves), tip, roof);
  }
}

/** A dome over a rectangle: rings of eight, rounding up to its top. */
export function dome(
  w: Writer,
  f: Frame,
  L: number,
  S: number,
  eaves: number,
  rise: number,
  roof: string,
): void {
  const SIDES = 8;
  const RINGS = 4;
  const ring = (k: number): V[] => {
    const a = (k / RINGS) * (Math.PI / 2);
    const out: V[] = [];
    for (let i = 0; i < SIDES; i++) {
      const t = (i / SIDES) * Math.PI * 2;
      out.push(
        at(
          f,
          (Math.cos(t) * L * Math.cos(a)) / 2,
          (Math.sin(t) * S * Math.cos(a)) / 2,
          eaves + rise * Math.sin(a),
        ),
      );
    }
    return out;
  };
  // Round the building's top first, where the dome sits.
  flat(w, f, L, S, eaves, roof);
  let lower = ring(0);
  for (let k = 1; k <= RINGS; k++) {
    const upper = ring(k);
    for (let i = 0; i < SIDES; i++) {
      const j = (i + 1) % SIDES;
      if (k === RINGS) w.tri(lower[i]!, lower[j]!, upper[i]!, roof);
      else w.quad(lower[i]!, lower[j]!, upper[j]!, upper[i]!, roof);
    }
    lower = upper;
  }
}

/** How high a roof of a shape rises over a building `S` across, where `span` is all there is to it. */
export function riseOf(shape: RoofShape, L: number, S: number, span: number): number {
  switch (shape) {
    case "flat":
    case "skillion":
    case "unsaid":
      return 0;
    case "gabled":
      return Math.min((S / 2) * 0.85, span * 0.35);
    case "hipped":
    case "mansard":
      return Math.min((S / 2) * 0.7, span * 0.3);
    case "pyramidal":
      // A slim one standing high is a spire, all roof.
      return span > Math.max(L, S) * 1.5 ? span * 0.95 : Math.min(Math.max(L, S) * 0.8, span * 0.6);
    case "dome":
      return Math.min(Math.min(L, S) / 2, span * 0.6);
  }
}

/** A roof of a shape at `eaves`, rising `rise`, over a rectangle. */
export function roofOf(
  w: Writer,
  f: Frame,
  shape: RoofShape,
  L: number,
  S: number,
  eaves: number,
  rise: number,
  wall: string,
  roof: string,
): void {
  if (rise <= 0.05) return flat(w, f, L, S, eaves, roof);
  switch (shape) {
    case "gabled":
      return gable(w, f, L, S, eaves, rise, wall, roof);
    case "hipped":
    case "mansard":
      return hipped(w, f, L, S, eaves, rise, roof);
    case "pyramidal":
      return pyramid(w, f, L, S, eaves, eaves + rise, roof);
    case "dome":
      return dome(w, f, L, S, eaves, rise, roof);
    default:
      return flat(w, f, L, S, eaves, roof);
  }
}
