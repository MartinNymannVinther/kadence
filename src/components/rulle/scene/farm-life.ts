import * as THREE from "three";
import { PALETTE as P } from "./palette";
import { box, merged, rod, v } from "./shapes";

/**
 * Cows and a flag (ADR 0034). A cow is a body and a head, drawn as two
 * instanced meshes a herd, so a head can turn to watch the rider go by —
 * black and white, or the red of the Danish red cow. The flag is
 * Dannebrog in its proportions (28 by 37, the cross four wide), a cloth
 * of little quads that waves.
 */

/** Where a cow's head turns, in the cow's coordinates. */
export const NECK = v(0, 1.18, -0.72);

export function cowBody(red: boolean): THREE.BufferGeometry {
  const hide = red ? P.cowRed : P.cowWhite;
  const parts = [
    box(0.56, 0.6, 1.5, hide, 0, 1.0, 0),
    box(0.46, 0.46, 0.3, hide, 0, 1.08, -0.78),
    box(0.22, 0.12, 0.3, P.muzzle, 0, 0.66, 0.35),
    rod(v(0, 1.22, 0.76), v(0, 0.66, 0.84), 0.025, hide),
  ];
  for (const [x, z] of [
    [-0.19, -0.56],
    [0.19, -0.56],
    [-0.19, 0.56],
    [0.19, 0.56],
  ] as const)
    parts.push(rod(v(x, 0.72, z), v(x, 0, z), 0.065, hide));
  if (!red)
    // Patches, on both sides and the back.
    parts.push(
      box(0.58, 0.34, 0.5, P.cowBlack, 0, 1.08, -0.3),
      box(0.58, 0.28, 0.36, P.cowBlack, 0, 0.94, 0.42),
      box(0.3, 0.02, 0.4, P.cowBlack, 0.08, 1.31, 0.1),
    );
  return merged(parts);
}

/** A cow's head, made about the neck: facing -z, the muzzle low. */
export function cowHead(red: boolean): THREE.BufferGeometry {
  const face = red ? P.cowRed : P.cowBlack;
  return merged([
    box(0.3, 0.32, 0.42, face, 0, 0, -0.22),
    box(0.26, 0.18, 0.14, P.muzzle, 0, -0.08, -0.46),
    box(0.16, 0.06, 0.08, face, -0.22, 0.1, -0.12),
    box(0.16, 0.06, 0.08, face, 0.22, 0.1, -0.12),
    ...(red ? [] : [box(0.1, 0.2, 0.02, P.cowWhite, 0, 0.04, -0.44)]),
  ]);
}

/** Dannebrog: the cloth along +z from the pole, `height` metres high, in quads that can wave. */
export function flagCloth(height: number): THREE.BufferGeometry {
  const length = (height * 37) / 28;
  // Seams where the cross begins and ends, and more between for the waving.
  const along = [0, 6, 12, 16, 21, 26, 31.5, 37].map((u) => u / 37);
  const down = [0, 6, 12, 16, 22, 28].map((w) => w / 28);
  const red = new THREE.Color(P.flagRed);
  const white = new THREE.Color(P.cowWhite);
  const positions: number[] = [];
  const colors: number[] = [];
  for (let i = 0; i < along.length - 1; i++)
    for (let j = 0; j < down.length - 1; j++) {
      const [u0, u1, w0, w1] = [along[i]!, along[i + 1]!, down[j]!, down[j + 1]!];
      const cross =
        (u0 >= 12 / 37 - 1e-6 && u1 <= 16 / 37 + 1e-6) ||
        (w0 >= 12 / 28 - 1e-6 && w1 <= 16 / 28 + 1e-6);
      const c = cross ? white : red;
      const corner = (u: number, w: number) => [0, -w * height, u * length];
      for (const p of [
        corner(u0, w0),
        corner(u0, w1),
        corner(u1, w1),
        corner(u0, w0),
        corner(u1, w1),
        corner(u1, w0),
      ]) {
        positions.push(...p);
        colors.push(c.r, c.g, c.b);
      }
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Moves a flag's cloth: waves that run from the pole out, larger toward the free end. */
export function wave(cloth: THREE.BufferGeometry, rest: Float32Array, t: number): void {
  const position = cloth.getAttribute("position") as THREE.BufferAttribute;
  const out = position.array as Float32Array;
  let far = 0;
  for (let i = 2; i < rest.length; i += 3) far = Math.max(far, rest[i]!);
  for (let i = 0; i < rest.length; i += 3) {
    const z = rest[i + 2]!;
    const y = rest[i + 1]!;
    const u = z / (far || 1);
    out[i] = Math.sin(u * 7 - t * 6 + y * 0.8) * 0.16 * u;
    out[i + 1] = y - u * u * 0.08;
    out[i + 2] = z * (1 - 0.03 * u);
  }
  position.needsUpdate = true;
}

/** A white flagpole with a gilt knob, `height` metres. */
export function flagPole(height: number): THREE.BufferGeometry {
  return merged([
    rod(v(0, 0, 0), v(0, height, 0), 0.05, P.cowWhite, 6),
    box(0.16, 0.14, 0.16, P.brass, 0, height + 0.06, 0),
  ]);
}

/** A post-and-rail fence along points, two rails. */
export function fence(points: THREE.Vector3[]): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    parts.push(box(0.1, 1.15, 0.1, P.fence, p.x, p.y + 0.5, p.z));
    const q = points[i + 1];
    if (q)
      for (const h of [0.55, 0.95])
        parts.push(rod(v(p.x, p.y + h, p.z), v(q.x, q.y + h, q.z), 0.035, P.fence, 4));
  }
  return merged(parts);
}
