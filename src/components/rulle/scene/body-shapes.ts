import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);

/** A round shape, `top` as wide as its foot is 1, eight-sided: a tapered limb, a torso. */
export const tapered = (top: number) => new THREE.CylinderGeometry(top, 1, 1, 8);

/**
 * A part of the figure's body (`RiderFigure`) — a limb, the torso, a band
 * round it — stood from `a` to `b`: `radius` across and `depth` (if other)
 * front to back.
 */
export function placeBetween(
  mesh: THREE.Mesh,
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  depth = radius,
): void {
  const along = new THREE.Vector3().subVectors(b, a);
  const length = along.length() || 1e-3;
  mesh.position.copy(a).addScaledVector(along, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, along.divideScalar(length));
  mesh.scale.set(radius, length, depth);
}
