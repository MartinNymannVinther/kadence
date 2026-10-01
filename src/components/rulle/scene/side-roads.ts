import * as THREE from "three";
import type { Land, RoadKind } from "@/modules/rulle";
import { groundAt, ROAD_HALF, sink, VERGE, type Ground } from "./ground";
import { PALETTE } from "./palette";
import { CHUNK, drawnHeight } from "./terrain";

/**
 * The roads round the route on its real land (ADR 0045), from a main road
 * to a path in the woods: each a strip on the land as wide as its kind,
 * asphalt, or gravel and earth where it is unpaved, built chunk by chunk
 * with the land. Where one meets the route it climbs the verge to the
 * asphalt's edge, so a side road joins it. What stands on the land keeps
 * off them (`on`). The route's own road is not among them: the land
 * script leaves it out, and the route draws it.
 */

/** Metres wide, by kind. */
export const ROAD_WIDTH: Record<RoadKind, number> = {
  main: 7,
  minor: 5.5,
  service: 3.2,
  track: 2.8,
  cycle: 2.2,
  foot: 1.6,
};
/** Where two meet, the wider lies over the narrower. */
const RANK: Record<RoadKind, number> = {
  main: 5,
  minor: 4,
  service: 3,
  cycle: 2,
  track: 1,
  foot: 0,
};
/** Metres between a strip's cross-sections: well within the land's 25 m triangles; closer by the route. */
const EVERY = 8;
const EVERY_NEAR = 2;
/** Within this of the route's middle a road lies on the route's verge, and on the route's asphalt is none. */
const VERGE_OUT = ROAD_HALF + VERGE;
const ON_ROUTE = ROAD_HALF - 0.3;
/** Metres a road lies above the land, and above the route's verge, where it is lower to meet the asphalt. */
const LIFT = 0.12;
const LIFT_NEAR = 0.06;
/** Metres of the squares `on` looks in, and the most room it is ever asked for beside a road. */
const CELL = 25;
const ROOM = 3;

type XZ = { x: number; z: number };
type Road = { half: number; rank: number; colour: THREE.Color; points: XZ[]; across: XZ[] };

const cellKey = (i: number, j: number) => (i + 32_768) * 65_536 + (j + 32_768);
const chunkKey = (x: number, z: number) => `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;

function colourOf(kind: RoadKind, unpaved: boolean): string {
  if (unpaved) return kind === "foot" ? PALETTE.dirt : PALETTE.gravel;
  if (kind === "foot") return PALETTE.pavement;
  if (kind === "cycle") return PALETTE.cycleTrack;
  return PALETTE.road;
}

export class SideRoads {
  readonly material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    // Drawn over the land it lies on, wherever the two come close.
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  });
  private readonly roads: Road[] = [];
  /** Each chunk's pieces: a road, and the point its piece starts at. */
  private readonly chunks = new Map<string, [number, number][]>();
  /** Each square's pieces, for `on`. */
  private readonly cells = new Map<number, [number, number][]>();

  constructor(
    land: Land,
    private readonly ground: Ground,
  ) {
    for (const road of land.roads) {
      const points = this.dense(road.points.map((p) => ({ x: p.x, z: -p.y })));
      if (points.length < 2) continue;
      const index = this.roads.length;
      this.roads.push({
        half: ROAD_WIDTH[road.kind] / 2,
        rank: RANK[road.kind],
        colour: new THREE.Color(colourOf(road.kind, road.unpaved)),
        points,
        across: across(points),
      });
      const half = ROAD_WIDTH[road.kind] / 2 + ROOM;
      for (let k = 0; k + 1 < points.length; k++) {
        const a = points[k]!;
        const b = points[k + 1]!;
        const key = chunkKey((a.x + b.x) / 2, (a.z + b.z) / 2);
        const list = this.chunks.get(key) ?? [];
        list.push([index, k]);
        this.chunks.set(key, list);
        for (
          let i = Math.floor((Math.min(a.x, b.x) - half) / CELL);
          i <= Math.floor((Math.max(a.x, b.x) + half) / CELL);
          i++
        )
          for (
            let j = Math.floor((Math.min(a.z, b.z) - half) / CELL);
            j <= Math.floor((Math.max(a.z, b.z) + half) / CELL);
            j++
          ) {
            const cell = this.cells.get(cellKey(i, j)) ?? [];
            cell.push([index, k]);
            this.cells.set(cellKey(i, j), cell);
          }
      }
    }
  }

  /** Whether a place is on a road, or within `room` metres of its edge (at most `ROOM`). */
  on(x: number, z: number, room = 0): boolean {
    const list = this.cells.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!list) return false;
    for (const [index, k] of list) {
      const road = this.roads[index]!;
      if (toSegment(x, z, road.points[k]!, road.points[k + 1]!) <= road.half + Math.min(room, ROOM))
        return true;
    }
    return false;
  }

  /** The chunk's roads, as one mesh; null where it has none. */
  build(cx: number, cz: number): THREE.Mesh | null {
    const pieces = this.chunks.get(`${cx},${cz}`);
    if (!pieces) return null;
    const positions: number[] = [];
    const colors: number[] = [];
    for (const [index, k] of pieces) {
      const road = this.roads[index]!;
      const a = road.points[k]!;
      const b = road.points[k + 1]!;
      // None on the route's own asphalt: the route is drawn there.
      if (this.ground.nearest((a.x + b.x) / 2, (a.z + b.z) / 2, 10).d < ON_ROUTE) continue;
      const side = (p: XZ, n: XZ, s: number) => {
        const x = p.x + n.x * road.half * s;
        const z = p.z + n.z * road.half * s;
        return [x, this.surface(x, z, road.rank), z] as const;
      };
      const [p, q, r, t] = [
        side(a, road.across[k]!, 1),
        side(a, road.across[k]!, -1),
        side(b, road.across[k + 1]!, -1),
        side(b, road.across[k + 1]!, 1),
      ];
      for (const v of [p, q, r, p, r, t]) {
        positions.push(v[0], v[1], v[2]);
        colors.push(road.colour.r, road.colour.g, road.colour.b);
      }
    }
    if (positions.length === 0) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.matrixAutoUpdate = false;
    mesh.receiveShadow = true;
    mesh.userData.own = true;
    return mesh;
  }

  dispose(): void {
    this.material.dispose();
  }

  /**
   * How high a road's edge lies here: on the land, or by the route on its
   * verge, falling from the asphalt's edge; under the route's bridge, on
   * the land below it.
   */
  surface(x: number, z: number, rank: number): number {
    const land = drawnHeight(this.ground, x, z);
    const up = rank * 0.005;
    const near = this.ground.nearest(x, z, VERGE_OUT + 1);
    const course = this.ground.course;
    if (near.d > VERGE_OUT || this.ground.onDeck(near.index * course.step)) return land + LIFT + up;
    const sunk = sink(course, near.index);
    const verge = near.ele + groundAt(near.d, sunk, this.ground.city !== null);
    const out = Math.max(0, near.d - ROAD_HALF) / VERGE;
    return Math.max(land, verge) + LIFT_NEAR + (LIFT - LIFT_NEAR) * out + up;
  }

  /** A road's line in pieces no longer than `EVERY` metres, and `EVERY_NEAR` by the route. */
  private dense(line: XZ[]): XZ[] {
    const out: XZ[] = line.length > 0 ? [line[0]!] : [];
    for (let k = 0; k + 1 < line.length; k++) {
      const a = line[k]!;
      const b = line[k + 1]!;
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const steps = Math.max(1, Math.ceil(len / EVERY));
      for (let s = 1; s <= steps; s++) {
        const from = out.at(-1)!;
        const to = { x: a.x + ((b.x - a.x) * s) / steps, z: a.z + ((b.z - a.z) * s) / steps };
        const mid = this.ground.nearest(
          (from.x + to.x) / 2,
          (from.z + to.z) / 2,
          VERGE_OUT + EVERY,
        );
        const fine = mid.d <= VERGE_OUT + EVERY ? Math.ceil(len / steps / EVERY_NEAR) : 1;
        for (let f = 1; f <= fine; f++)
          out.push({
            x: from.x + ((to.x - from.x) * f) / fine,
            z: from.z + ((to.z - from.z) * f) / fine,
          });
      }
    }
    return out.filter(
      (p, i) => i === 0 || Math.hypot(p.x - out[i - 1]!.x, p.z - out[i - 1]!.z) > 0.01,
    );
  }
}

/** Across a line at each of its points, to its left: the way between its neighbours, turned a quarter. */
function across(points: XZ[]): XZ[] {
  return points.map((_, k) => {
    const a = points[Math.max(0, k - 1)]!;
    const b = points[Math.min(points.length - 1, k + 1)]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return { x: (b.z - a.z) / len, z: -(b.x - a.x) / len };
  });
}

/** Metres from a place to a piece of road. */
function toSegment(x: number, z: number, a: XZ, b: XZ): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(a.x + t * dx - x, a.z + t * dz - z);
}
