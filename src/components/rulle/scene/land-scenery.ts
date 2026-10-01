import * as THREE from "three";
import type { Land, LineKind } from "@/modules/rulle";
import { buildingsMesh, lookOf, type Footprint, type Look } from "./buildings";
import type { Ground } from "./ground";
import { hash } from "./noise";
import type { Batches } from "./props";
import { CHUNK, drawnHeight } from "./terrain";
import { plant, type TreeShapes } from "./trees";
import { streamStrips } from "./water";
import { madeUpBuildings } from "./made-up-buildings";
import { family } from "./woods";

/**
 * What stands on the real land round a route that comes with Kadence
 * (ADR 0035), chunk by chunk: its buildings where OpenStreetMap has them,
 * as far from the road as its file says (700 metres, or the whole land:
 * ADR 0045); beyond that, where no one's house is drawn, a town filled
 * with houses and a farmyard with its farm, of the same making. The tree rows and the hedges along their lines, the
 * streams, the wind turbines. In a city (ADR 0036) its street trees, and
 * blocks of flats as high as the city's own where the map gives a
 * building no storeys. Sorted into chunks once, when the ride begins.
 */

const SPACING: Record<LineKind, number> = { river: 8, stream: 8, trees: 8.5, hedge: 3.6 };
const WIDTH = { river: 6, stream: 1.6 } as const;
/** Nothing stands nearer the road's middle than this: in a city, the pavement is the street's. */
const CLEAR = { country: 6.5, city: 8.5 } as const;
/** A street tree stands on the pavement, beyond the cycle track. */
const TREE_FROM = 5.3;

type XZ = { x: number; z: number };
type Bucket = {
  buildings: Footprint[];
  lines: number[];
  farms: (XZ & { seed: number })[];
  turbines: XZ[];
  trees: XZ[];
};

const key = (x: number, z: number) => `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;

export class LandScenery {
  private readonly buckets = new Map<string, Bucket>();
  /** A city's usual storeys: what its mapped buildings have, most often. */
  private readonly usual: number;
  /** How the city builds, or the country (ADR 0036). */
  private readonly look: Look;

  constructor(
    private readonly land: Land,
    private readonly ground: Ground,
  ) {
    this.look = lookOf(ground.city);
    const bucket = (k: string) => {
      let found = this.buckets.get(k);
      if (!found) {
        found = { buildings: [], lines: [], farms: [], turbines: [], trees: [] };
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
        height: b.height,
        minHeight: b.minHeight,
        roof: b.roof,
        roofColour: b.roofColour,
      });
    });
    const told = land.buildings
      .filter((b) => (b.kind === "house" || b.kind === "block") && b.levels >= 2)
      .map((b) => b.levels)
      .sort((a, b) => a - b);
    this.usual = told.length > 20 ? told[Math.floor(told.length / 2)]! : 4;
    for (const t of land.trees) bucket(key(t.x, -t.y)).trees.push({ x: t.x, z: -t.y });
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
      if (ground.nearest(x, -y, land.reach + 100).d > land.reach)
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
      ...(found?.buildings ?? [])
        .filter((b) => this.clear(b) && free(b.x, b.z))
        .map((b) => {
          const near = this.ground.nearest(b.x, b.z, 220);
          return { ...b, far: near.d, road: this.roadAt(near.index, near.d) };
        }),
      ...madeUpBuildings(
        this.ground,
        this.usual,
        cx,
        cz,
        found?.farms ?? [],
        free,
        this.land.reach,
      ).map((b) => ({ ...b, far: this.land.reach })),
    ];
    const meshes: THREE.Mesh[] = [];
    const buildings = buildingsMesh(
      footprints,
      height,
      material,
      (b) => this.storeys(b),
      this.look,
    );
    if (buildings) meshes.push(buildings);
    // The street trees the map has, on the pavement and never in the road.
    for (const [k, t] of (found?.trees ?? []).entries()) {
      if (hash(cx * 131 + k, cz, 641) > density) continue;
      if (this.ground.nearest(t.x, t.z, 15).d < TREE_FROM || !free(t.x, t.z)) continue;
      const tree = family("town", hash(cx * 131 + k, cz, 642));
      const at = new THREE.Vector3(t.x, height(t.x, t.z) - 0.25, t.z);
      plant(
        batches,
        shapes,
        tree === "conifers" ? "broadleaves" : tree,
        at,
        0.9 + hash(k, cx, 643) * 0.35,
        [cx * 131 + k, cz + 7],
      );
    }
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

  /**
   * Storeys for a building the map gives none: in the country one; in a
   * city a shed or a kiosk one or two, anything bigger about as many as
   * the city's own, a storey more or less.
   */
  private storeys(b: Footprint): number {
    if (!this.ground.city) return 1;
    const area = b.w * b.d;
    if (area < 60) return 1;
    if (area < 150) return 2;
    return Math.max(2, this.usual + Math.floor(hash(b.seed, 3, 651) * 3) - 1);
  }

  /** The road's point at a sample, where one was near at all. */
  private roadAt(index: number, d: number): { x: number; z: number } | null {
    const course = this.ground.course;
    if (!Number.isFinite(d) || index < 0 || index >= course.x.length) return null;
    return { x: course.x[index]!, z: -course.y[index]! };
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
      if (this.ground.nearest(x, z, 20).d < (this.ground.city ? CLEAR.city : CLEAR.country))
        return false;
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
}

const BREAK = { x: NaN, z: NaN };

function inside(p: { x: number; z: number }, cx: number, cz: number): boolean {
  return Math.floor(p.x / CHUNK) === cx && Math.floor(p.z / CHUNK) === cz;
}
