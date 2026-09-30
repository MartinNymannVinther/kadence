import * as THREE from "three";
import type { Ground } from "./ground";
import { hash } from "./noise";

/**
 * The land around the rider, in square chunks that are built as the ride
 * comes near them and let go behind it, so a route of any length costs
 * the same. Each chunk is a grid of flat-shaded triangles, every face in
 * the colour of the field, wood or pasture it lies in, a shade lighter or
 * darker so the facets read.
 */

export const CHUNK = 400;
const STEP = 25;
/** Chunks whose middle is within this of the camera are kept. */
const RADIUS = 2300;

export type ChunkKey = string;

/**
 * The land's height as it is drawn: on the terrain's own triangles, whose
 * corners are the ground's heights every `STEP` metres, rather than the
 * smooth ground between them — so what stands on the land stands on it.
 * The diagonals alternate as `build` lays them (a chunk is an even number
 * of steps, so a corner's parity is the same counted from any chunk).
 */
export function drawnHeight(ground: Ground, x: number, z: number): number {
  const a = Math.floor(x / STEP);
  const b = Math.floor(z / STEP);
  const u = x / STEP - a;
  const v = z / STEP - b;
  const h = (i: number, j: number) => ground.height((a + i) * STEP, (b + j) * STEP);
  const h00 = h(0, 0);
  const h11 = h(1, 1);
  if ((((a + b) % 2) + 2) % 2 === 0)
    // Split from (0,0) to (1,1).
    return v >= u
      ? h00 + (h(0, 1) - h00) * v + (h11 - h(0, 1)) * u
      : h00 + (h(1, 0) - h00) * u + (h11 - h(1, 0)) * v;
  // Split from (1,0) to (0,1).
  const h10 = h(1, 0);
  const h01 = h(0, 1);
  return u + v <= 1
    ? h00 + (h10 - h00) * u + (h01 - h00) * v
    : h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
}

export class Terrain {
  readonly group = new THREE.Group();
  private readonly chunks = new Map<ChunkKey, THREE.Mesh>();
  private readonly material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });

  constructor(
    private readonly ground: Ground,
    private readonly onChunk: (key: ChunkKey, cx: number, cz: number, added: boolean) => void,
  ) {}

  /** Builds what has come within reach and lets go of what is behind; at most `budget` a call. */
  update(x: number, z: number, budget = 2): void {
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const r = Math.ceil(RADIUS / CHUNK);
    const wanted: [number, number, number][] = [];
    for (let i = cx - r; i <= cx + r; i++)
      for (let j = cz - r; j <= cz + r; j++) {
        const d = Math.hypot((i + 0.5) * CHUNK - x, (j + 0.5) * CHUNK - z);
        if (d <= RADIUS && !this.chunks.has(`${i},${j}`)) wanted.push([d, i, j]);
      }
    wanted.sort((a, b) => a[0] - b[0]);
    for (const [, i, j] of wanted.slice(0, budget)) this.build(i, j);
    for (const [key, mesh] of this.chunks) {
      const [i, j] = key.split(",").map(Number) as [number, number];
      if (Math.hypot((i + 0.5) * CHUNK - x, (j + 0.5) * CHUNK - z) > RADIUS + CHUNK) {
        this.group.remove(mesh);
        mesh.geometry.dispose();
        this.chunks.delete(key);
        this.onChunk(key, i, j, false);
      }
    }
  }

  /** Every chunk within reach of a place, built at once: before the ride starts. */
  fill(x: number, z: number): void {
    this.update(x, z, Infinity);
  }

  dispose(): void {
    for (const mesh of this.chunks.values()) mesh.geometry.dispose();
    this.chunks.clear();
    this.material.dispose();
  }

  private build(i: number, j: number): void {
    const n = CHUNK / STEP;
    const x0 = i * CHUNK;
    const z0 = j * CHUNK;
    const heights = new Float32Array((n + 1) * (n + 1));
    for (let b = 0; b <= n; b++)
      for (let a = 0; a <= n; a++)
        heights[b * (n + 1) + a] = this.ground.height(x0 + a * STEP, z0 + b * STEP);
    const positions = new Float32Array(n * n * 6 * 3);
    const colors = new Float32Array(n * n * 6 * 3);
    const color = new THREE.Color();
    let p = 0;
    const corner = (a: number, b: number) =>
      [x0 + a * STEP, heights[b * (n + 1) + a]!, z0 + b * STEP] as const;
    for (let b = 0; b < n; b++)
      for (let a = 0; a < n; a++) {
        const c00 = corner(a, b);
        const c10 = corner(a + 1, b);
        const c01 = corner(a, b + 1);
        const c11 = corner(a + 1, b + 1);
        // The diagonal alternates, so the facets do not all lean one way.
        const flip = (a + b) % 2 === 0;
        const faces = flip
          ? [
              [c00, c01, c11],
              [c00, c11, c10],
            ]
          : [
              [c00, c01, c10],
              [c10, c01, c11],
            ];
        for (const face of faces) {
          const mx = (face[0]![0] + face[1]![0] + face[2]![0]) / 3;
          const mz = (face[0]![2] + face[1]![2] + face[2]![2]) / 3;
          color.set(this.ground.patch(mx, mz).color);
          color.multiplyScalar(0.94 + hash(Math.round(mx), Math.round(mz), 5) * 0.1);
          for (const v of face) {
            positions.set(v, p);
            colors.set([color.r, color.g, color.b], p);
            p += 3;
          }
        }
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.matrixAutoUpdate = false;
    this.group.add(mesh);
    this.chunks.set(`${i},${j}`, mesh);
    this.onChunk(`${i},${j}`, i, j, true);
  }
}
