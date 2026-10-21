/**
 * The road across, from its middle out (ADR 0033, 0036, 0037): how wide
 * the asphalt is, the verge falling from it to the land, a city street's
 * kerbs, cycle track and pavement, and a bridge's sides — the shape the
 * road is drawn in (`road.ts`), and the shape the land must stay under
 * (`road-clear.ts`). Pure: numbers in, metres out.
 */

import type { Course } from "@/modules/rulle";

/** Half the road's width, metres: a Danish country road. */
export const ROAD_HALF = 3;
/** The grass verge beyond the asphalt, metres, falling from the road to the land. */
export const VERGE = 7;

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

/**
 * A bridge's side, metres: the edge beside the asphalt and how high it
 * stands, the parapet's thickness and height, and the deck's depth below
 * the road.
 */
export const BRIDGE = { edge: 0.9, kerb: 0.12, wall: 0.25, parapet: 0.85, depth: 1.1 } as const;
