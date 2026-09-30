/**
 * Deterministic randomness for the landscape: the same route is the same
 * place every ride. A hash of integer coordinates, smooth value noise
 * over it, and the few layered octaves that make a Danish moraine — long
 * low swells with smaller ones on top, never a mountain.
 */

import { hash } from "@/modules/rulle";

export { hash };

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Smooth noise in [-1, 1], one bump per unit. */
export function valueNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const u = fade(x - ix);
  const v = fade(z - iz);
  const a = hash(ix, iz, seed);
  const b = hash(ix + 1, iz, seed);
  const c = hash(ix, iz + 1, seed);
  const d = hash(ix + 1, iz + 1, seed);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}

/** Metres of rise and fall around a mean: swells of a kilometre, and smaller ones on them. */
export function hills(x: number, z: number): number {
  return (
    16 * valueNoise(x / 950, z / 950, 11) +
    6 * valueNoise(x / 320, z / 320, 23) +
    1.8 * valueNoise(x / 105, z / 105, 37)
  );
}

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
