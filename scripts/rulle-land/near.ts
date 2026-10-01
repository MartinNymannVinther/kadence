import type { Course } from "@/modules/rulle";
import type { P } from "./shapes";

/** A road is the route's own where it is this close and runs its way, within about 30°. */
const ROUTE_NEAR = 8;
const ROUTE_ALONG = Math.cos(Math.PI / 6);

/**
 * How near the route a place is, for the land script (ADR 0035, 0045), in
 * metres on the course's plane: roughly, to its samples (`fromRoad`, what
 * decides whether a building far off is on the skyline); exactly, to its
 * line between them (`onRoad`); and whether a step along a road is the
 * route's own (`isRoute`): close to it, and running its way.
 */
export function nearTheRoad(course: Course) {
  const fromRoad = (p: P) => {
    let best = Infinity;
    for (let i = 0; i < course.x.length; i += 3)
      best = Math.min(best, Math.hypot(course.x[i]! - p.x, course.y[i]! - p.y));
    return best;
  };
  const nearRoad = (p: P) => {
    let best = { d: Infinity, dx: 1, dy: 0 };
    for (let i = 0; i + 1 < course.x.length; i++) {
      const dx = course.x[i + 1]! - course.x[i]!;
      const dy = course.y[i + 1]! - course.y[i]!;
      const f = Math.max(
        0,
        Math.min(
          1,
          ((p.x - course.x[i]!) * dx + (p.y - course.y[i]!) * dy) / (dx * dx + dy * dy || 1),
        ),
      );
      const d = Math.hypot(course.x[i]! + f * dx - p.x, course.y[i]! + f * dy - p.y);
      if (d < best.d) best = { d, dx, dy };
    }
    return best;
  };
  const onRoad = (p: P) => nearRoad(p).d;
  const isRoute = (a: P, b: P) => {
    if (onRoad(a) > ROUTE_NEAR || onRoad(b) > ROUTE_NEAR) return false;
    const at = nearRoad({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const along = Math.abs((b.x - a.x) * at.dx + (b.y - a.y) * at.dy);
    return along >= ROUTE_ALONG * Math.hypot(b.x - a.x, b.y - a.y) * Math.hypot(at.dx, at.dy);
  };
  return { fromRoad, onRoad, isRoute };
}
