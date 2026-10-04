import * as THREE from "three";
import { PALETTE as P } from "./palette";
import { painted } from "./props";
import { bar, box, merged, rod, v } from "./shapes";

/**
 * The rider's road bike, up close: a frame with a sloping top tube and
 * thin stays, a fork, a saddle on its post, drop bars in white tape with
 * the brake hoods, deep rims on thin tyres with their spokes, and a
 * crankset whose arms and pedals turn under the feet. The parts that do
 * not move are one geometry in their own colours; each wheel is another,
 * turning on its hub, and the cranks another, turning about the bottom
 * bracket. Facing -z, y up, x to the rider's right, as `RiderFigure`.
 */

export const WHEEL = 0.34;
export const CRANK = 0.17;
/** The bottom bracket, where the cranks turn. */
export const BB = v(0, 0.3, 0.05);

const REAR = v(0, WHEEL, 0.52);
const FRONT = v(0, WHEEL, -0.5);
const SEAT = v(0, 0.82, 0.18);
const HEAD_TOP = v(0, 0.87, -0.37);
const HEAD_FOOT = v(0, 0.74, -0.41);
/** Where the stem meets the bar. */
const CLAMP = v(0, 0.94, -0.46);

/** The drop bar's right half, from the stem out along the tops, forward to the hood and round the drop. */
const BAR = [v(0, 0.94, -0.46), v(0.2, 0.94, -0.46), v(0.205, 0.95, -0.52)];
const DROP = [v(0.205, 0.95, -0.52), v(0.21, 0.915, -0.565), v(0.21, 0.87, -0.57)];
const DROP_END = [v(0.21, 0.87, -0.57), v(0.21, 0.84, -0.54), v(0.21, 0.83, -0.46)];

const mirror = (p: THREE.Vector3) => v(-p.x, p.y, p.z);
const path = (points: THREE.Vector3[], r: number, color: string) =>
  points.slice(1).map((p, i) => rod(points[i]!, p, r, color, 6));

function frame(): THREE.BufferGeometry[] {
  const parts = [
    rod(BB, SEAT, 0.02, P.frame, 6),
    rod(SEAT, HEAD_TOP, 0.019, P.frame, 6),
    rod(BB, HEAD_FOOT, 0.026, P.frame, 6),
    rod(HEAD_TOP, HEAD_FOOT, 0.024, P.frame, 6),
    rod(SEAT, v(0, 0.92, 0.205), 0.014, P.dark, 6),
    rod(HEAD_TOP, v(0, 0.9, -0.375), 0.019, P.dark, 6),
    rod(v(0, 0.9, -0.375), CLAMP, 0.016, P.frame, 6),
    // The saddle: a narrow nose, a wider back.
    box(0.06, 0.028, 0.2, P.saddle, 0, 0.935, 0.12),
    box(0.13, 0.03, 0.09, P.saddle, 0, 0.937, 0.245),
    // The bottle in its cage on the down tube.
    rod(v(0, 0.52, -0.12), v(0, 0.66, -0.27), 0.033, P.bidon, 8),
    // The chainring, the cassette and the chain between them.
    disc(0.1, 0.008, P.alloy, BB, 0.065),
    disc(0.045, 0.03, P.alloy, REAR, 0.055),
    rod(v(0.065, BB.y + 0.1, BB.z), v(0.055, WHEEL + 0.045, REAR.z), 0.005, P.dark, 4),
    rod(v(0.065, BB.y - 0.1, BB.z), v(0.06, WHEEL - 0.09, 0.49), 0.005, P.dark, 4),
    box(0.02, 0.07, 0.03, P.dark, 0.07, WHEEL - 0.06, 0.5),
  ];
  for (const side of [-1, 1]) {
    const x = (p: THREE.Vector3) => (side > 0 ? p : mirror(p));
    parts.push(
      rod(v(side * 0.03, BB.y, BB.z), x(v(0.055, WHEEL, REAR.z)), 0.012, P.frame, 6),
      rod(v(side * 0.02, SEAT.y - 0.02, SEAT.z + 0.01), x(v(0.055, WHEEL, REAR.z)), 0.01, P.frame),
      rod(v(side * 0.03, HEAD_FOOT.y, HEAD_FOOT.z), x(v(0.05, WHEEL, FRONT.z)), 0.014, P.frame, 6),
      ...path(BAR.map(x), 0.014, P.barTape),
      ...path(DROP.map(x), 0.014, P.barTape),
      ...path(DROP_END.map(x), 0.014, P.barTape),
      // The brake hood, standing up and forward from where the bar turns down.
      rod(x(v(0.205, 0.95, -0.52)), x(v(0.205, 0.978, -0.555)), 0.018, P.dark, 6),
    );
  }
  return parts;
}

/** A disc on the axle (x), `r` round and `w` wide, centred on `at` and moved `x` across. */
function disc(r: number, w: number, color: string, at = v(0, 0, 0), x = 0) {
  const geometry = new THREE.CylinderGeometry(r, r, w, 20).rotateZ(Math.PI / 2);
  return painted(geometry.translate(x, at.y, at.z), color);
}

/** A wheel about its own hub: a thin tyre on a deep rim, the hub and its spokes. */
function wheel(): THREE.BufferGeometry {
  const ring = (radius: number, tube: number, flat: number, color: string) =>
    painted(
      new THREE.TorusGeometry(radius, tube, 5, 32).rotateY(Math.PI / 2).scale(flat, 1, 1),
      color,
    );
  const spokes: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const hub = v(i % 2 ? 0.025 : -0.025, 0, 0);
    spokes.push(bar(hub, v(0, Math.sin(a) * 0.26, Math.cos(a) * 0.26), 0.004, P.alloy));
  }
  return merged([
    ring(WHEEL - 0.013, 0.013, 1, P.tyre),
    ring(WHEEL - 0.05, 0.036, 0.32, P.rim),
    disc(0.02, 0.09, P.alloy),
    ...spokes,
  ]);
}

/** The cranks about the bottom bracket: the right arm forward at a turn of nothing, the left back. */
function cranks(): THREE.BufferGeometry {
  return merged([
    bar(v(0.085, 0, 0), v(0.09, 0, -CRANK), 0.02, P.alloy),
    bar(v(-0.085, 0, 0), v(-0.09, 0, CRANK), 0.02, P.alloy),
    box(0.07, 0.014, 0.06, P.dark, 0.12, 0, -CRANK),
    box(0.07, 0.014, 0.06, P.dark, -0.12, 0, CRANK),
    disc(0.018, 0.17, P.alloy),
  ]);
}

export class RoadBike {
  readonly group = new THREE.Group();
  private readonly material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });
  private readonly wheels: THREE.Group[] = [];
  private readonly crankset: THREE.Group;
  private readonly geometries: THREE.BufferGeometry[] = [];

  constructor() {
    this.group.add(this.mesh(merged(frame())));
    for (const hub of [REAR, FRONT]) {
      const pivot = new THREE.Group();
      pivot.position.copy(hub);
      pivot.add(this.mesh(wheel()));
      this.group.add(pivot);
      this.wheels.push(pivot);
    }
    this.crankset = new THREE.Group();
    this.crankset.position.copy(BB);
    this.crankset.add(this.mesh(cranks()));
    this.group.add(this.crankset);
  }

  /** The wheels rolled on by `metres`, and the cranks at `crank` (0: the right pedal forward). */
  turn(metres: number, crank: number): void {
    for (const wheel of this.wheels) wheel.rotation.x -= metres / WHEEL;
    this.crankset.rotation.x = -crank;
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    this.material.dispose();
  }

  private mesh(geometry: THREE.BufferGeometry): THREE.Mesh {
    this.geometries.push(geometry);
    return new THREE.Mesh(geometry, this.material);
  }
}
