import * as THREE from "three";
import type { Ground } from "./ground";
import { hash } from "./noise";
import { PALETTE } from "./palette";

/**
 * Water that catches the light (ADR 0035): the sea, the lakes at their
 * own level, and the streams and rivers the land has. One shiny material
 * for all of it, so the sun low in the south-west glints on it; the
 * surface's normals lean a little this way and that, so the glint breaks
 * up as it would on water that a breeze is on; and the flatter it is
 * looked at, the more of the pale sky it gives back, as water does.
 */

/** How much a normal leans, at most, either way. */
export const RIPPLE = 0.05;

export function waterMaterial(): THREE.MeshPhongMaterial {
  const material = new THREE.MeshPhongMaterial({
    color: PALETTE.water,
    specular: new THREE.Color(PALETTE.glint).multiplyScalar(0.5),
    shininess: 30,
  });
  const sky = new THREE.Color(PALETTE.skyTop).lerp(new THREE.Color(PALETTE.haze), 0.55);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.skyTint = { value: sky };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 skyTint;")
      .replace(
        "#include <opaque_fragment>",
        [
          "float facing = abs( dot( normalize( vViewPosition ), normal ) );",
          "outgoingLight = mix( outgoingLight, skyTint, pow( 1.0 - facing, 5.0 ) * 0.8 );",
          "#include <opaque_fragment>",
        ].join("\n"),
      );
  };
  return material;
}

/** An up normal leaning a little, the same wherever the same point is asked for. */
function ripple(x: number, z: number, normals: number[]): void {
  const nx = (hash(Math.round(x), Math.round(z), 401) - 0.5) * 2 * RIPPLE;
  const nz = (hash(Math.round(x), Math.round(z), 402) - 0.5) * 2 * RIPPLE;
  const len = Math.hypot(nx, 1, nz);
  normals.push(nx / len, 1 / len, nz / len);
}

/**
 * The lakes over a square of the terrain's cells: a flat face at the
 * lake's level over every cell a lake reaches into, or its neighbour
 * does. The land's triangles rise through it at the shore, so the shore
 * follows the lie of the land rather than the cells. None next to the
 * road where the road runs lower than the lake beside it: the bank there
 * keeps the water off the road.
 */
const REACHES: readonly (readonly [number, number])[] = [
  [-0.5, -0.5],
  [0.5, -0.5],
  [1.5, -0.5],
  [-0.5, 0.5],
  [0.5, 0.5],
  [1.5, 0.5],
  [-0.5, 1.5],
  [0.5, 1.5],
  [1.5, 1.5],
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];

export function lakeSurface(
  ground: Ground,
  a0: number,
  b0: number,
  cells: number,
  step: number,
  material: THREE.Material,
): THREE.Mesh | null {
  if (!ground.land) return null;
  const positions: number[] = [];
  const normals: number[] = [];
  for (let b = b0; b < b0 + cells; b++)
    for (let a = a0; a < a0 + cells; a++) {
      const x = a * step;
      const z = b * step;
      let level = -Infinity;
      for (const [u, v] of REACHES) {
        const found = ground.lake(x + u * step, z + v * step);
        if (found !== null) level = Math.max(level, found);
      }
      if (level === -Infinity) continue;
      const road = ground.nearest(x + step / 2, z + step / 2, 40);
      if (road.d < 32 && level > road.ele - 0.8) continue;
      const y = level + 0.02;
      const corners = [
        [x, z],
        [x, z + step],
        [x + step, z + step],
        [x, z],
        [x + step, z + step],
        [x + step, z],
      ] as const;
      for (const [cx, cz] of corners) {
        positions.push(cx, y, cz);
        ripple(cx, cz, normals);
      }
    }
  return surface(positions, normals, material);
}

/**
 * The streams and rivers too narrow to be mapped as water of their own:
 * a strip on the land along each, a river's broader than a stream's.
 * Not under the road, where they would run through a culvert.
 */
export function streamStrips(
  ground: Ground,
  lines: { points: { x: number; z: number }[]; width: number }[],
  height: (x: number, z: number) => number,
  material: THREE.Material,
  /** Whether a piece whose middle is here is this mesh's to draw. */
  keep: (x: number, z: number) => boolean,
): THREE.Mesh | null {
  const positions: number[] = [];
  const normals: number[] = [];
  for (const { points, width } of lines)
    for (let k = 0; k + 1 < points.length; k++) {
      const p = points[k]!;
      const q = points[k + 1]!;
      const dx = q.x - p.x;
      const dz = q.z - p.z;
      const len = Math.hypot(dx, dz);
      // A gap in the line (where it left the chunk and came back) has no length to draw.
      if (!(len >= 0.5) || len > 40) continue;
      const mx = (p.x + q.x) / 2;
      const mz = (p.z + q.z) / 2;
      if (!keep(mx, mz) || ground.nearest(mx, mz, 20).d < 12) continue;
      // Half the width across the way it runs, to its left: the strip then faces up.
      const sx = (-dz / len) * (width / 2);
      const sz = (dx / len) * (width / 2);
      const hp = height(p.x, p.z) + 0.12;
      const hq = height(q.x, q.z) + 0.12;
      const quad = [
        [p.x - sx, hp, p.z - sz],
        [p.x + sx, hp, p.z + sz],
        [q.x + sx, hq, q.z + sz],
        [p.x - sx, hp, p.z - sz],
        [q.x + sx, hq, q.z + sz],
        [q.x - sx, hq, q.z - sz],
      ] as const;
      for (const [x, y, z] of quad) {
        positions.push(x, y, z);
        ripple(x, z, normals);
      }
    }
  return surface(positions, normals, material);
}

function surface(
  positions: number[],
  normals: number[],
  material: THREE.Material,
): THREE.Mesh | null {
  if (positions.length === 0) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.matrixAutoUpdate = false;
  mesh.receiveShadow = true;
  return mesh;
}
