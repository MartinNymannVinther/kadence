import * as THREE from "three";
import { write, type Footprint, type Storeys } from "./building-kinds";
import { lookOf, type Look } from "./building-look";
import { Writer } from "./building-writer";

/**
 * A chunk's buildings (ADR 0035, 0036), written straight into one
 * geometry (`building-kinds.ts` writes each), each building's first
 * vertex and count kept so what a stop needs room for can be folded away.
 */

export type { Footprint, Storeys } from "./building-kinds";
export { lookOf, type Look } from "./building-look";

export type Buildings = THREE.Mesh & { userData: { parts: number[] } };

/** One mesh for the buildings of a chunk; each building's first vertex and count kept for folding. */
export function buildingsMesh(
  list: Footprint[],
  height: (x: number, z: number) => number,
  material: THREE.Material,
  storeys: Storeys = () => 1,
  look: Look = lookOf(null),
): Buildings | null {
  if (list.length === 0) return null;
  const w = new Writer();
  const parts: number[] = [];
  for (const b of list) {
    const start = w.count;
    write(w, b, height, storeys, look);
    parts.push(b.x, b.z, start, w.count - start);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(w.positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(w.colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material) as unknown as Buildings;
  mesh.userData.parts = parts;
  return mesh;
}

/** Folds away every building of the mesh within `r` metres of a place: its triangles are made points. */
export function foldAround(mesh: Buildings, x: number, z: number, r: number): void {
  const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
  const parts = mesh.userData.parts;
  let changed = false;
  for (let k = 0; k < parts.length; k += 4) {
    if (Math.hypot(parts[k]! - x, parts[k + 1]! - z) > r) continue;
    const start = parts[k + 2]!;
    const count = parts[k + 3]!;
    for (let i = start; i < start + count; i++) position.setXYZ(i, parts[k]!, -1000, parts[k + 1]!);
    changed = true;
  }
  if (changed) position.needsUpdate = true;
}
