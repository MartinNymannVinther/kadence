import * as THREE from "three";
import type { Course, StructureKind, Underpass } from "@/modules/rulle";
import { ROAD_HALF } from "./ground";
import { PALETTE as P } from "./palette";
import { roadPoint, roadYaw } from "./road-point";
import { box, merged, rod, v } from "./shapes";

/**
 * Where a path or a farm track goes under the road in a tunnel of its own
 * (ADR 0037), what the rider sees of it: a railing on each side of the
 * road for as long as the tunnel is wide, where the road crosses it as a
 * little bridge. One geometry for all of them.
 */

/** How wide what passes under is, metres. */
const UNDER: Record<StructureKind, number> = {
  path: 4,
  road: 8,
  motorway: 22,
  rail: 7,
  green: 6,
  water: 3,
};

export function underpassShapes(
  course: Course,
  underpasses: readonly Underpass[],
): THREE.BufferGeometry | null {
  const parts: THREE.BufferGeometry[] = [];
  for (const u of underpasses) {
    // Along the road for as long as the tunnel is wide where the road crosses it, and a little more.
    const long = UNDER[u.kind] / Math.max(0.35, Math.sin(u.angle)) + 3;
    const yaw = roadYaw(course, u.along);
    for (const side of [-1, 1]) {
      const at = roadPoint(course, u.along, side * (ROAD_HALF + 0.45));
      const railing: THREE.BufferGeometry[] = [
        box(0.06, 0.06, long, P.metal, 0, 1.0, 0),
        box(0.05, 0.05, long, P.metal, 0, 0.55, 0),
        box(0.35, 0.2, long + 0.4, P.bridge, 0, 0.1, 0),
      ];
      for (let z = -long / 2; z <= long / 2 + 0.01; z += 1.6)
        railing.push(rod(v(0, 0.1, z), v(0, 1.02, z), 0.035, P.metal, 4, true));
      parts.push(merged(railing).rotateY(yaw).translate(at.x, at.y, at.z));
    }
  }
  return parts.length > 0 ? merged(parts) : null;
}
