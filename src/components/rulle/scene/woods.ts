import * as THREE from "three";
import type { Ground } from "./ground";
import type { PatchKind } from "./land-cover";
import { hash } from "./noise";
import type { Batches } from "./props";
import { CHUNK, drawnHeight } from "./terrain";
import { plant, type Family, type TreeShapes } from "./trees";

/**
 * The trees of a chunk of land. On the real land (ADR 0035) they stand
 * where the land says: close in a wood — mostly beech and oak, some of
 * them turning, or mostly spruce where the wood is conifer — birches on
 * the heath and the wet ground, a tree in a garden now and then, rarely
 * one in a field. On the made-up land the same, where the patchwork has
 * its woods. Each tree's place, kind, size and shade come from hashing
 * where it stands, so the same route is the same country.
 */

/** The share of the places in a chunk where a tree grows, by what covers the land. */
const GROWS: Record<PatchKind, number> = {
  forest: 0.9,
  conifer: 0.92,
  orchard: 0.5,
  town: 0.1,
  yard: 0.08,
  wetland: 0.07,
  heath: 0.05,
  meadow: 0.025,
  pasture: 0.012,
  field: 0.006,
  industry: 0.02,
  sand: 0.01,
  water: 0,
  cemetery: 0.14,
};

/** Places along a chunk's side: about 13 metres apart on the real land, 20 on the made-up. */
const REAL_SIDE = 30;
const MADE_UP_SIDE = 20;

/** Which kind of tree grows here, for a roll in [0, 1). */
export function family(kind: PatchKind, roll: number): Family {
  switch (kind) {
    case "conifer":
      return roll < 0.84 ? "conifers" : roll < 0.93 ? "birches" : "broadleaves";
    case "forest":
      return roll < 0.1
        ? "conifers"
        : roll < 0.18
          ? "birches"
          : roll < 0.5
            ? "autumn"
            : "broadleaves";
    case "heath":
    case "wetland":
    case "sand":
      return roll < 0.5 ? "birches" : roll < 0.75 ? "conifers" : "bushes";
    case "town":
      return roll < 0.2
        ? "conifers"
        : roll < 0.38
          ? "birches"
          : roll < 0.62
            ? "autumn"
            : "broadleaves";
    default:
      return roll < 0.35 ? "autumn" : roll < 0.45 ? "birches" : "broadleaves";
  }
}

/** How big a tree of a family grows here: an orchard's are small, a wood's crowns close. */
function size(kind: PatchKind, tree: Family, roll: number): number {
  if (kind === "orchard") return 0.5 + roll * 0.15;
  if (tree === "bushes") return 0.8 + roll * 0.5;
  if (kind === "forest" || kind === "conifer") return 1.05 + roll * 0.6;
  if (kind === "town") return 0.7 + roll * 0.4;
  return 0.8 + roll * 0.6;
}

export function plantWoods(
  batches: Batches,
  shapes: TreeShapes,
  ground: Ground,
  cx: number,
  cz: number,
  density: number,
  free: (x: number, z: number) => boolean,
): void {
  const real = ground.land !== null;
  const n = real ? REAL_SIDE : MADE_UP_SIDE;
  const side = CHUNK / n;
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++) {
      const ia = cx * n + a;
      const ib = cz * n + b;
      if (hash(ia, ib, 90) > density) continue;
      const x = (ia + hash(ia, ib, 91)) * side;
      const z = (ib + hash(ia, ib, 92)) * side;
      const patch = ground.patch(x, z);
      if (hash(ia, ib, 93) > GROWS[patch.kind]) continue;
      const wood = patch.kind === "forest" || patch.kind === "conifer";
      if (ground.nearest(x, z, 24).d < (wood ? 11 : 16) || !free(x, z)) continue;
      const y = drawnHeight(ground, x, z);
      if (real ? ground.wet(x, z) : y < 0.4) continue;
      const tree = family(patch.kind, hash(ia, ib, 97));
      const scale = size(patch.kind, tree, hash(ia, ib, 94));
      plant(batches, shapes, tree, new THREE.Vector3(x, y - 0.3, z), scale, [ia, ib]);
    }
}
