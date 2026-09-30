import * as THREE from "three";
import { hash, type Course, type Stretch } from "@/modules/rulle";
import { ROAD_HALF } from "./ground";
import { PALETTE } from "./palette";
import { roadPoint } from "./road-point";

/**
 * The cobbles (ADR 0036): where a city's course runs down a cobbled
 * street, the road is granite setts in rows instead of asphalt, and no
 * lines are painted on it. A strip over the asphalt, its stones a
 * texture drawn once on a canvas; they read from the saddle, and the
 * camera and the bike shake over them (`world.ts`).
 */

/** Metres of road one repeat of the stones covers, either way. */
const TILE = 1.6;
const ROWS = 8;

function settTexture(): THREE.CanvasTexture {
  const size = 256;
  const element = document.createElement("canvas");
  element.width = size;
  element.height = size;
  const context = element.getContext("2d")!;
  context.fillStyle = PALETTE.settGaps;
  context.fillRect(0, 0, size, size);
  const row = size / ROWS;
  const stone = row * 1.35;
  for (let r = 0; r < ROWS; r++) {
    // Every other row shifted half a stone: the stones lie in bond.
    const shift = r % 2 === 0 ? 0 : stone / 2;
    for (let k = -1; k * stone < size; k++) {
      const x = k * stone + shift;
      const tone = PALETTE.setts[Math.floor(hash(r, k, 311) * PALETTE.setts.length)]!;
      context.fillStyle = tone;
      context.beginPath();
      context.roundRect(x + 2, r * row + 2, stone - 4, row - 4, 5);
      context.fill();
      // Worn smooth on top: a lighter crown on each stone.
      context.fillStyle = "rgba(255, 255, 255, 0.08)";
      context.fillRect(x + 7, r * row + 6, stone - 14, row / 3);
    }
  }
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/** The cobbled stretches of the course, as one mesh; null where there are none. */
export function cobblesMesh(course: Course, stretches: readonly Stretch[]): THREE.Mesh | null {
  if (stretches.length === 0) return null;
  const positions: number[] = [];
  const uvs: number[] = [];
  const left = new THREE.Vector3();
  const right = new THREE.Vector3();
  const nextLeft = new THREE.Vector3();
  const nextRight = new THREE.Vector3();
  const across = (2 * ROAD_HALF) / TILE;
  for (const s of stretches)
    for (let d = s.from; d < s.to; d += 2) {
      const e = Math.min(s.to, d + 2);
      roadPoint(course, d, -ROAD_HALF, left);
      roadPoint(course, d, ROAD_HALF, right);
      roadPoint(course, e, ROAD_HALF, nextRight);
      roadPoint(course, e, -ROAD_HALF, nextLeft);
      // Near left, near right, far right, far left: wound to face up, as the road's own quads.
      const corners: [THREE.Vector3, number, number][] = [
        [left, 0, d],
        [right, across, d],
        [nextRight, across, e],
        [left, 0, d],
        [nextRight, across, e],
        [nextLeft, 0, e],
      ];
      for (const [p, u, at] of corners) {
        positions.push(p.x, p.y + 0.006, p.z);
        uvs.push(u, at / TILE);
      }
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const material = new THREE.MeshLambertMaterial({
    map: settTexture(),
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

/** Frees the cobbles' geometry, texture and material. */
export function disposeCobbles(mesh: THREE.Mesh): void {
  const material = mesh.material as THREE.MeshLambertMaterial;
  material.map?.dispose();
  material.dispose();
  mesh.geometry.dispose();
}
