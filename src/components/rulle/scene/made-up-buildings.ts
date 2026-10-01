import type { Footprint } from "./buildings";
import type { Ground } from "./ground";
import { hash } from "./noise";
import { CHUNK } from "./terrain";

/**
 * Buildings no one mapped for the ride: houses filling a town and a
 * hall or two in an industrial estate beyond the mapped ones, and a
 * farm on each farmyard out there. The land's file says how far from the
 * road its buildings reach (`mapped`); a file with every building in its
 * land has none made up (ADR 0045).
 */
export function madeUpBuildings(
  ground: Ground,
  /** The city's usual storeys. */
  usual: number,
  cx: number,
  cz: number,
  farms: { x: number; z: number; seed: number }[],
  free: (x: number, z: number) => boolean,
  /** Metres from the road the land's own buildings reach. */
  mapped: number,
): Footprint[] {
  const out: Footprint[] = [];
  const middle = ground.nearest((cx + 0.5) * CHUNK, (cz + 0.5) * CHUNK, mapped + CHUNK).d;
  for (const farm of farms) {
    const turn = hash(farm.seed, 1, 611) * Math.PI;
    const seed = 1_000_000 + farm.seed;
    out.push({ x: farm.x, z: farm.z, w: 14, d: 8, angle: turn, kind: "house", levels: 1, seed });
    const bx = farm.x + Math.cos(turn) * 4 + Math.sin(turn) * 16;
    const bz = farm.z - Math.sin(turn) * 4 + Math.cos(turn) * 16;
    out.push({
      x: bx,
      z: bz,
      w: 11,
      d: 26,
      angle: turn,
      kind: "farm",
      levels: 1,
      seed: seed + 1,
    });
  }
  if (middle < mapped - CHUNK * 0.71) return out;
  const n = 12;
  const side = CHUNK / n;
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++) {
      const ia = cx * n + a;
      const ib = cz * n + b;
      const x = (ia + 0.2 + hash(ia, ib, 621) * 0.6) * side;
      const z = (ib + 0.2 + hash(ia, ib, 622) * 0.6) * side;
      const kind = ground.patch(x, z).kind;
      const town = kind === "town" && hash(ia, ib, 623) < 0.55;
      const hall = kind === "industry" && hash(ia, ib, 623) < 0.3;
      if (!town && !hall) continue;
      if (middle < mapped + CHUNK * 0.71 && ground.nearest(x, z, mapped + 50).d <= mapped) continue;
      if (!free(x, z)) continue;
      const seed = 2_000_000 + ia * 7919 + ib;
      // A city's blocks stand square to one another, as its streets run.
      const grid = hash(cx, cz, 628) * Math.PI;
      out.push(
        town && ground.city
          ? {
              x,
              z,
              w: 18 + hash(ia, ib, 624) * 12,
              d: 11 + hash(ia, ib, 625) * 4,
              angle: grid + (hash(ia, ib, 626) < 0.5 ? 0 : Math.PI / 2),
              kind: "block",
              levels: usual + Math.floor(hash(ia, ib, 627) * 3) - 1,
              seed,
            }
          : town
            ? {
                x,
                z,
                w: 8 + hash(ia, ib, 624) * 6,
                d: 7 + hash(ia, ib, 625) * 3,
                angle: hash(ia, ib, 626) * Math.PI,
                kind: "house",
                levels: hash(ia, ib, 627) < 0.2 ? 2 : 1,
                seed,
              }
            : {
                x,
                z,
                w: 20 + hash(ia, ib, 624) * 16,
                d: 14 + hash(ia, ib, 625) * 10,
                angle: hash(ia, ib, 626) * Math.PI,
                kind: "big",
                levels: 1,
                seed,
              },
      );
    }
  return out;
}
