import * as THREE from "three";
import { PALETTE as P } from "./palette";
import { painted } from "./props";
import { box, merged, rod, v, wheel } from "./shapes";

/**
 * What race day puts on a city's course (ADR 0036), low-poly: a section
 * of galvanised crowd barrier, an island in the road with its blue
 * keep-right sign, a speed bump across the road, a team bus, the podium
 * and a bin. Each in its own frame: facing -z (along the road, where it
 * lies along it), y up, standing on y = 0.
 */

/** A section of crowd barrier, `BARRIER_LENGTH` along the road (z): posts, rails, bars and feet. */
export const BARRIER_LENGTH = 2.3;

export function barrierShape(): THREE.BufferGeometry {
  const a = BARRIER_LENGTH / 2;
  // Hundreds of them: tubes open at their ends, where nobody looks.
  const tube = (from: THREE.Vector3, to: THREE.Vector3, r: number, sides = 4) =>
    rod(from, to, r, P.metal, sides, true);
  const parts = [
    tube(v(0, 0, a), v(0, 1.1, a), 0.025),
    tube(v(0, 0, -a), v(0, 1.1, -a), 0.025),
    tube(v(0, 1.1, a + 0.02), v(0, 1.1, -a - 0.02), 0.025),
    tube(v(0, 0.15, a), v(0, 0.15, -a), 0.02),
    box(0.7, 0.04, 0.06, P.metal, 0, 0.02, a - 0.1),
    box(0.7, 0.04, 0.06, P.metal, 0, 0.02, -a + 0.1),
  ];
  for (let i = 1; i < 8; i++) {
    const z = a - (2 * a * i) / 8;
    parts.push(tube(v(0, 0.15, z), v(0, 1.1, z), 0.012, 3));
  }
  return merged(parts);
}

/** An island's length along the road and its width, metres. */
export const ISLAND = { length: 7, width: 1.1, height: 0.13 } as const;

/**
 * An island in the road: kerbed, paved on top, narrower at its ends, and
 * at the end the riders come to (+z) a blue sign with a white arrow down
 * to the right — keep right — facing them.
 */
export function islandShape(): THREE.BufferGeometry {
  const { length: L, width: W, height: H } = ISLAND;
  const body = L - 1.1;
  const end = L / 2 - 0.8;
  const white = "#f4f1ea";
  const face = end + 0.035;
  return merged([
    box(W, H, body, P.kerb, 0, H / 2, 0),
    box(W * 0.6, H, 0.55, P.kerb, 0, H / 2, body / 2 + 0.27),
    box(W * 0.6, H, 0.55, P.kerb, 0, H / 2, -body / 2 - 0.27),
    box(W - 0.24, 0.02, body - 0.2, P.island, 0, H + 0.01, 0),
    rod(v(0, H, end), v(0, 1.45, end), 0.03, P.metal, 5),
    painted(
      new THREE.CylinderGeometry(0.3, 0.3, 0.03, 12).rotateX(Math.PI / 2).translate(0, 1.72, end),
      P.signBlue,
    ),
    box(0.06, 0.3, 0.01, white)
      .rotateZ(Math.PI / 4)
      .translate(-0.03, 1.75, face),
    painted(
      new THREE.ConeGeometry(0.1, 0.14, 3)
        .rotateZ((-3 * Math.PI) / 4)
        .scale(1, 1, 0.15)
        .translate(0.08, 1.64, face),
      white,
    ),
  ]);
}

/** A speed bump's length along the road and its height, metres. */
export const BUMP = { length: 3.6, height: 0.075 } as const;

/** How high a bump stands `z` metres into it, from its start. */
export const bumpAt = (z: number) =>
  z <= 0 || z >= BUMP.length
    ? 0
    : BUMP.height * (0.5 - 0.5 * Math.cos((2 * Math.PI * z) / BUMP.length));

/**
 * A speed bump across the road's six metres: a smooth hump, and white
 * teeth up its near side pointing the way the road runs. It starts at
 * z = 0 and runs toward -z.
 */
export function bumpShape(half = 3): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const paint = (hex: string) => new THREE.Color(hex);
  const tri = (a: number[], b: number[], c: number[], color: THREE.Color) => {
    positions.push(...a, ...b, ...c);
    for (let k = 0; k < 3; k++) colors.push(color.r, color.g, color.b);
  };
  const asphalt = paint(P.road);
  const white = paint(P.bumpWhite);
  const N = 10;
  for (let k = 0; k < N; k++) {
    const z0 = (k / N) * BUMP.length;
    const z1 = ((k + 1) / N) * BUMP.length;
    const a = [-half, bumpAt(z0), -z0];
    const b = [half, bumpAt(z0), -z0];
    const c = [half, bumpAt(z1), -z1];
    const d = [-half, bumpAt(z1), -z1];
    tri(a, b, c, asphalt);
    tri(a, c, d, asphalt);
  }
  // The teeth, a hair above the hump.
  for (let x = -half + 0.5; x < half - 0.2; x += 1) {
    const base = 0.2;
    const tip = 1.3;
    tri(
      [x - 0.3, bumpAt(base) + 0.006, -base],
      [x + 0.3, bumpAt(base) + 0.006, -base],
      [x, bumpAt(tip) + 0.006, -tip],
      white,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** A team's bus, 12.5 m along z: its colour, a band of dark windows, a white stripe, six wheels. */
export function busShape(color: string): THREE.BufferGeometry {
  const L = 12.5;
  const W = 2.55;
  const H = 3.6;
  const low = 0.4;
  const parts = [
    box(W, H - low, L, color, 0, low + (H - low) / 2, 0),
    box(W + 0.02, 0.95, L - 3.4, P.glass, 0, 2.65, 1.0),
    box(W - 0.3, 1.5, 0.04, P.glass, 0, 2.4, -L / 2 - 0.01),
    box(W + 0.03, 0.22, L - 0.4, P.podium, 0, 1.3, 0),
    box(1.5, 0.3, 2.6, P.metal, 0, H + 0.15, 1.5),
  ];
  for (const z of [-4.2, 3.3, 4.7]) {
    parts.push(wheel(0.5, 0.3, P.tyre, -W / 2 + 0.1, z));
    parts.push(wheel(0.5, 0.3, P.tyre, W / 2 - 0.1, z));
  }
  return merged(parts);
}

/** The podium, its front to -z: first in the middle, second and third either side, the wall behind. */
export function podiumShape(): THREE.BufferGeometry {
  const step = (x: number, h: number) => [
    box(1.3, h, 1.1, P.podium, x, h / 2, 0),
    box(1.3, 0.16, 0.02, P.cap, x, h - 0.14, -0.56),
  ];
  return merged([
    ...step(0, 1.0),
    ...step(1.3, 0.7),
    ...step(-1.3, 0.45),
    box(5.4, 2.9, 0.15, P.cap, 0, 1.45, 1.05),
    box(5.6, 0.14, 0.22, P.metal, 0, 2.95, 1.05),
    rod(v(-2.7, 0, 1.2), v(-2.7, 2.9, 1.2), 0.05, P.metal),
    rod(v(2.7, 0, 1.2), v(2.7, 2.9, 1.2), 0.05, P.metal),
  ]);
}

/** A bin for what the riders throw in the litter zone: green, on a post. */
export function binShape(): THREE.BufferGeometry {
  return merged([
    rod(v(0, 0, 0), v(0, 1.0, 0), 0.03, P.metal, 4),
    painted(new THREE.CylinderGeometry(0.28, 0.24, 0.6, 8).translate(0, 0.8, -0.3), P.cap),
  ]);
}
