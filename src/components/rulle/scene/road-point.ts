import * as THREE from "three";
import { courseAt, type Course } from "@/modules/rulle";
import { groundAt, ROAD_HALF, sink, VERGE, type Ground } from "./ground";
import { drawnHeight } from "./terrain";

/**
 * Places along the road, for whatever stands or moves by it: a point
 * `offset` metres right of the road's middle, the way the road runs, and
 * the ground there as it is drawn — the asphalt, the verge falling from
 * it, or the land's own triangles further out.
 */

/** A point on the road `offset` metres right of its middle, on the road's surface. */
export function roadPoint(
  course: Course,
  distance: number,
  offset: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  const p = courseAt(course, distance);
  const q = courseAt(course, distance + 1);
  const dx = q.x - p.x;
  const dz = -(q.y - p.y);
  const len = Math.hypot(dx, dz) || 1;
  return out.set(p.x + (-dz / len) * offset, p.ele + 0.03, -p.y + (dx / len) * offset);
}

/** The turn about the vertical that faces a thing made facing -z along the road at `distance`. */
export function roadYaw(course: Course, distance: number): number {
  const a = roadPoint(course, distance - 2, 0);
  const b = roadPoint(course, distance + 2, 0);
  return Math.atan2(-(b.x - a.x), -(b.z - a.z));
}

/** A point `offset` metres right of the road's middle, on whatever is drawn there. */
export function groundPoint(
  course: Course,
  ground: Ground,
  distance: number,
  offset: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  roadPoint(course, distance, offset, out);
  const beyond = Math.abs(offset) - ROAD_HALF;
  if (beyond <= 0) return out;
  if (beyond <= VERGE) {
    const along = distance - Math.floor(distance / course.length) * course.length;
    const index = Math.min(course.x.length - 1, Math.floor(along / course.step));
    out.y += groundAt(offset, sink(course, index)) - 0.03;
    return out;
  }
  out.y = drawnHeight(ground, out.x, out.z);
  return out;
}
