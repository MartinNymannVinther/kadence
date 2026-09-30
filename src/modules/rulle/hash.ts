/**
 * Deterministic randomness: a number in [0, 1) for integer coordinates and
 * a seed. Whatever Rulle places by chance — a tree, a farm, a dog by the
 * road — is placed by this, so the same route is the same place every
 * ride, and a test can say where things will be.
 */
export function hash(ix: number, iz: number, seed = 0): number {
  let h =
    Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
