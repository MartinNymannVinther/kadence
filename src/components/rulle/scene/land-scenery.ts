import * as THREE from "three";
import type { Land, LineKind } from "@/modules/rulle";
import { buildingsMesh, type Footprint } from "./buildings";
import type { Ground } from "./ground";
import { hash } from "./noise";
import type { Batches } from "./props";
import { CHUNK, drawnHeight } from "./terrain";
import { plant, type TreeShapes } from "./trees";
import { streamStrips } from "./water";
import { family } from "./woods";

/**
 * What stands on the real land round a route that comes with Kadence
 * (ADR 0035), chunk by chunk: its buildings where OpenStreetMap has them,
 * which is within 650 metres of the road; beyond that, where no one's
 * house is drawn, a town filled with houses and a farmyard with its farm,
 * of the same making. The tree rows and the hedges along their lines, the
 * streams, the wind turbines. Sorted into chunks once, when the ride
 * begins.
 */

/** Buildings are in the land's file this far from the road; beyond it they are made up. */
const MAPPED = 700;
const SPACING: Record<LineKind, number> = { river: 8, stream: 8, trees: 8.5, hedge: 3.6 };
const WIDTH = { river: 6, stream: 1.6 } as const;

type Bucket = {
  buildings: Footprint[];
  lines: number[];
  farms: { x: number; z: number; seed: number }[];
  turbines: { x: number; z: number }[];
};

const key = (x: number, z: number) => `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;

export class LandScenery {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly land: Land,
    private readonly ground: Ground,
  ) {
    const bucket = (k: string) => {
      let found = this.buckets.get(k);
      if (!found) {
        found = { buildings: [], lines: [], farms: [], turbines: [] };
        this.buckets.set(k, found);
      }
      return found;
    };
    land.buildings.forEach((b, seed) => {
      const x = b.x;
      const z = -b.y;
      bucket(key(x, z)).buildings.push({
        x,
        z,
        w: b.w,
        d: b.d,
        angle: b.angle,
        kind: b.kind,
        levels: b.levels,
        seed,
      });
    });
    land.lines.forEach((line, index) => {
      const seen = new Set<string>();
      for (let k = 0; k < line.points.length; k++) {
        const p = line.points[k]!;
        const q = line.points[Math.min(k + 1, line.points.length - 1)]!;
        // Every chunk a line passes through, even on a long straight between two points.
        const steps = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / (CHUNK / 2)));
        for (let s = 0; s <= steps; s++) {
          const k2 = key(p.x + ((q.x - p.x) * s) / steps, -(p.y + ((q.y - p.y) * s) / steps));
          if (!seen.has(k2)) {
            seen.add(k2);
            bucket(k2).lines.push(index);
          }
        }
      }
    });
    for (const area of land.areas) {
      if (area.kind !== "yard") continue;
      const ring = area.rings[0]!;
      let x = 0;
      let y = 0;
      for (const p of ring) {
        x += p.x;
        y += p.y;
      }
      x /= ring.length;
      y /= ring.length;
      if (ground.nearest(x, -y, MAPPED + 100).d > MAPPED)
        bucket(key(x, -y)).farms.push({ x, z: -y, seed: area.id });
    }
    for (const t of land.turbines) bucket(key(t.x, -t.y)).turbines.push({ x: t.x, z: -t.y });
  }

  turbines(cx: number, cz: number): { x: number; z: number }[] {
    return this.buckets.get(`${cx},${cz}`)?.turbines ?? [];
  }

  /**
   * The chunk's buildings and streams, as meshes; its tree rows and hedges
   * go into `batches` with the chunk's woods.
   */
  build(
    cx: number,
    cz: number,
    batches: Batches,
    shapes: TreeShapes,
    material: THREE.Material,
    water: THREE.Material,
    density: number,
    free: (x: number, z: number) => boolean,
  ): THREE.Mesh[] {
    const found = this.buckets.get(`${cx},${cz}`);
    const height = (x: number, z: number) => drawnHeight(this.ground, x, z);
    const footprints = [
      ...(found?.buildings ?? []).filter((b) => this.clear(b) && free(b.x, b.z)),
      ...this.madeUp(cx, cz, found?.farms ?? [], free),
    ];
    const meshes: THREE.Mesh[] = [];
    const buildings = buildingsMesh(footprints, height, material);
    if (buildings) meshes.push(buildings);
    const streams: { points: { x: number; z: number }[]; width: number }[] = [];
    for (const index of found?.lines ?? []) {
      const line = this.land.lines[index]!;
      const points = this.along(line.points, SPACING[line.kind], cx, cz);
      if (line.kind === "river" || line.kind === "stream") {
        streams.push({ points, width: WIDTH[line.kind] });
        continue;
      }
      points.forEach((p, k) => {
        if (!inside(p, cx, cz) || hash(index, k, 601) > density) return;
        if (this.ground.nearest(p.x, p.z, 15).d < 8 || !free(p.x, p.z) || this.ground.wet(p.x, p.z))
          return;
        const hedge = line.kind === "hedge";
        const tree = hedge
          ? hash(index, k, 602) < 0.25
            ? "broadleaves"
            : "bushes"
          : family("meadow", hash(index, k, 603));
        const scale = hedge ? 0.75 + hash(index, k, 604) * 0.55 : 0.85 + hash(index, k, 604) * 0.35;
        const at = new THREE.Vector3(p.x, height(p.x, p.z) - 0.25, p.z);
        plant(batches, shapes, tree, at, scale, [index * 7 + 3, k]);
      });
    }
    const strips = streamStrips(this.ground, streams, height, water, (x, z) =>
      inside({ x, z }, cx, cz),
    );
    if (strips) meshes.push(strips);
    for (const mesh of meshes) mesh.userData.own = true;
    return meshes;
  }

  /** Whether a building stands clear of the road: none of its corners or sides on it. */
  private clear(b: Footprint): boolean {
    const c = Math.cos(b.angle);
    const s = -Math.sin(b.angle);
    for (const [u, v] of [
      [0, 0],
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const) {
      const x = b.x + (c * u * b.w) / 2 + (s * v * b.d) / 2;
      const z = b.z + (s * u * b.w) / 2 - (c * v * b.d) / 2;
      if (this.ground.nearest(x, z, 20).d < 6.5) return false;
    }
    return true;
  }

  /** Points along a line every `spacing` metres, those near the chunk. */
  private along(points: { x: number; y: number }[], spacing: number, cx: number, cz: number) {
    const out: { x: number; z: number }[] = [];
    const x0 = cx * CHUNK - spacing;
    const x1 = (cx + 1) * CHUNK + spacing;
    const z0 = cz * CHUNK - spacing;
    const z1 = (cz + 1) * CHUNK + spacing;
    for (let k = 0; k + 1 < points.length; k++) {
      const p = points[k]!;
      const q = points[k + 1]!;
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      const steps = Math.max(1, Math.round(len / spacing));
      for (let s = 0; s < steps; s++) {
        const x = p.x + ((q.x - p.x) * s) / steps;
        const z = -(p.y + ((q.y - p.y) * s) / steps);
        if (x >= x0 && x < x1 && z >= z0 && z < z1) out.push({ x, z });
        else if (out.length > 0 && out.at(-1) !== BREAK) out.push(BREAK);
      }
    }
    const last = points.at(-1);
    if (last && last.x >= x0 && last.x < x1 && -last.y >= z0 && -last.y < z1)
      out.push({ x: last.x, z: -last.y });
    return out.filter((p, i) => p !== BREAK || (i > 0 && i < out.length - 1));
  }

  /**
   * Buildings no one mapped for the ride: houses filling a town and a
   * hall or two in an industrial estate beyond the mapped ones, and a
   * farm on each farmyard out there.
   */
  private madeUp(
    cx: number,
    cz: number,
    farms: { x: number; z: number; seed: number }[],
    free: (x: number, z: number) => boolean,
  ): Footprint[] {
    const out: Footprint[] = [];
    const middle = this.ground.nearest((cx + 0.5) * CHUNK, (cz + 0.5) * CHUNK, MAPPED + CHUNK).d;
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
    if (middle < MAPPED - CHUNK * 0.71) return out;
    const n = 12;
    const side = CHUNK / n;
    for (let a = 0; a < n; a++)
      for (let b = 0; b < n; b++) {
        const ia = cx * n + a;
        const ib = cz * n + b;
        const x = (ia + 0.2 + hash(ia, ib, 621) * 0.6) * side;
        const z = (ib + 0.2 + hash(ia, ib, 622) * 0.6) * side;
        const kind = this.ground.patch(x, z).kind;
        const town = kind === "town" && hash(ia, ib, 623) < 0.55;
        const hall = kind === "industry" && hash(ia, ib, 623) < 0.3;
        if (!town && !hall) continue;
        if (middle < MAPPED + CHUNK * 0.71 && this.ground.nearest(x, z, MAPPED + 50).d <= MAPPED)
          continue;
        if (!free(x, z)) continue;
        const seed = 2_000_000 + ia * 7919 + ib;
        out.push(
          town
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
}

const BREAK = { x: NaN, z: NaN };

function inside(p: { x: number; z: number }, cx: number, cz: number): boolean {
  return Math.floor(p.x / CHUNK) === cx && Math.floor(p.z / CHUNK) === cz;
}
