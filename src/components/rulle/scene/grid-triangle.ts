/**
 * The terrain's triangles (`terrain.ts`): corners every `GRID` metres, and
 * the diagonal of each square alternating from one square to the next, as
 * the terrain lays them (a chunk is an even number of squares, so a
 * corner's parity is the same counted from any chunk). Which triangle a
 * place lies in, its three corners and how much each counts there — the
 * drawn land's height is their heights so weighted. Pure.
 */

/** Metres between the corners of the terrain's triangles. */
export const GRID = 25;

/** A corner of the terrain, by its column and row. */
export type GridCorner = readonly [number, number];

export type GridTriangle = {
  corners: readonly [GridCorner, GridCorner, GridCorner];
  /** How much each corner counts at the place, summing to one. */
  weights: readonly [number, number, number];
};

export function gridTriangle(x: number, z: number): GridTriangle {
  const a = Math.floor(x / GRID);
  const b = Math.floor(z / GRID);
  const u = x / GRID - a;
  const v = z / GRID - b;
  const c = (i: number, j: number): GridCorner => [a + i, b + j];
  if ((((a + b) % 2) + 2) % 2 === 0)
    // Split from (0,0) to (1,1).
    return v >= u
      ? { corners: [c(0, 0), c(0, 1), c(1, 1)], weights: [1 - v, v - u, u] }
      : { corners: [c(0, 0), c(1, 0), c(1, 1)], weights: [1 - u, u - v, v] };
  // Split from (1,0) to (0,1).
  return u + v <= 1
    ? { corners: [c(0, 0), c(1, 0), c(0, 1)], weights: [1 - u - v, u, v] }
    : { corners: [c(1, 1), c(0, 1), c(1, 0)], weights: [u + v - 1, 1 - u, 1 - v] };
}
