import * as THREE from "three";
import { merged, painted } from "./props";

/**
 * The primitives the small figures are made of (ADR 0034): boxes, rods,
 * balls and wheels in one colour each, placed in the figure's own
 * coordinates — facing -z, y up, metres — and merged into one geometry
 * per figure, or per part that moves.
 */

export { merged };

const UP = new THREE.Vector3(0, 1, 0);

export function box(
  w: number,
  h: number,
  d: number,
  color: string,
  x = 0,
  y = 0,
  z = 0,
): THREE.BufferGeometry {
  return painted(new THREE.BoxGeometry(w, h, d).translate(x, y, z), color);
}

export function ball(
  r: number,
  color: string,
  x = 0,
  y = 0,
  z = 0,
  scale: [number, number, number] = [1, 1, 1],
): THREE.BufferGeometry {
  return painted(new THREE.IcosahedronGeometry(r, 0).scale(...scale).translate(x, y, z), color);
}

/** A round rod from `a` to `b`: a leg, an arm, a tube of a frame; `open` at its ends, where nobody looks. */
export function rod(
  a: THREE.Vector3,
  b: THREE.Vector3,
  r: number,
  color: string,
  segments = 5,
  open = false,
): THREE.BufferGeometry {
  const along = new THREE.Vector3().subVectors(b, a);
  const length = Math.max(1e-3, along.length());
  const geometry = new THREE.CylinderGeometry(r, r, length, segments, 1, open);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, along.normalize()));
  const middle = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  return painted(geometry.translate(middle.x, middle.y, middle.z), color);
}

/** A square bar from `a` to `b`: an arm in a crowd of thousands, cheaper than a rod. */
export function bar(
  a: THREE.Vector3,
  b: THREE.Vector3,
  w: number,
  color: string,
): THREE.BufferGeometry {
  const along = new THREE.Vector3().subVectors(b, a);
  const geometry = new THREE.BoxGeometry(w, Math.max(1e-3, along.length()), w);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, along.normalize()));
  const middle = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  return painted(geometry.translate(middle.x, middle.y, middle.z), color);
}

/** A wheel standing up, its axle along x, touching the ground. */
export function wheel(r: number, width: number, color: string, x: number, z: number) {
  return painted(
    new THREE.CylinderGeometry(r, r, width, 10).rotateZ(Math.PI / 2).translate(x, r, z),
    color,
  );
}

export const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Where a knee (or an elbow) is, for its two bones and their ends: bent forward, toward -z. */
export function knee(
  hip: THREE.Vector3,
  foot: THREE.Vector3,
  upper: number,
  lower: number,
): THREE.Vector3 {
  const dy = foot.y - hip.y;
  const dz = foot.z - hip.z;
  const d = Math.min(upper + lower - 1e-3, Math.max(1e-3, Math.hypot(dy, dz)));
  const uy = dy / d;
  const uz = dz / d;
  const cos = (upper * upper + d * d - lower * lower) / (2 * upper * d);
  const alpha = Math.acos(Math.min(1, Math.max(-1, cos)));
  const sign = uy < 0 ? 1 : -1;
  return new THREE.Vector3(
    (hip.x + foot.x) / 2,
    hip.y + uy * upper * Math.cos(alpha) - uz * upper * Math.sin(alpha) * sign,
    hip.z + uz * upper * Math.cos(alpha) + uy * upper * Math.sin(alpha) * sign,
  );
}

const unit = new THREE.CylinderGeometry(1, 1, 1, 5);

/** A limb placed between two points each frame: a leg on a pedal, an arm with a bell. */
export class Limb {
  readonly mesh: THREE.Mesh;

  constructor(
    private readonly radius: number,
    material: THREE.Material,
  ) {
    this.mesh = new THREE.Mesh(unit, material);
  }

  between(a: THREE.Vector3, b: THREE.Vector3): void {
    const along = new THREE.Vector3().subVectors(b, a);
    const length = along.length() || 1e-3;
    this.mesh.position.copy(a).addScaledVector(along, 0.5);
    this.mesh.quaternion.setFromUnitVectors(UP, along.divideScalar(length));
    this.mesh.scale.set(this.radius, length, this.radius);
  }
}

/** A shape that turns about a joint: its geometry is placed so the joint is at its origin. */
export function jointed(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  at: THREE.Vector3,
) {
  const pivot = new THREE.Group();
  pivot.position.copy(at);
  pivot.add(new THREE.Mesh(geometry.translate(-at.x, -at.y, -at.z), material));
  return pivot;
}
