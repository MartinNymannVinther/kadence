import type { Course } from "@/modules/rulle";
import type { P } from "./shapes";

/**
 * How far a place on the course's plane lies from the road, metres, for
 * the land script (ADR 0035): roughly, to every third of the road's
 * points — what decides whether a building far off is on the skyline —
 * and exactly, to the road's own line between its points; and whether a
 * step along another road is the route's own (ADR 0046).
 */
export function fromRoad(course: Course, p: P): number {
  let best = Infinity;
  for (let i = 0; i < course.x.length; i += 3)
    best = Math.min(best, Math.hypot(course.x[i]! - p.x, course.y[i]! - p.y));
  return best;
}

export function onRoad(course: Course, p: P): number {
  return nearRoad(course, p).d;
}

/** A road is the route's own where it is this close and runs its way, within about 30°. */
const ROUTE_NEAR = 8;
const ROUTE_ALONG = Math.cos(Math.PI / 6);

/** Whether a step along a road, `a` to `b`, is the route's own: close to it, and running its way. */
export function isRoute(course: Course, a: P, b: P): boolean {
  if (onRoad(course, a) > ROUTE_NEAR || onRoad(course, b) > ROUTE_NEAR) return false;
  const at = nearRoad(course, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const along = Math.abs((b.x - a.x) * at.dx + (b.y - a.y) * at.dy);
  return along >= ROUTE_ALONG * Math.hypot(b.x - a.x, b.y - a.y) * Math.hypot(at.dx, at.dy);
}

/** The nearest point of the road's line, how far, and the way the road runs there. */
function nearRoad(course: Course, p: P): { d: number; dx: number; dy: number } {
  let best = { d: Infinity, dx: 1, dy: 0 };
  for (let i = 0; i + 1 < course.x.length; i++) {
    const dx = course.x[i + 1]! - course.x[i]!;
    const dy = course.y[i + 1]! - course.y[i]!;
    const along =
      ((p.x - course.x[i]!) * dx + (p.y - course.y[i]!) * dy) / (dx * dx + dy * dy || 1);
    const f = Math.max(0, Math.min(1, along));
    const d = Math.hypot(course.x[i]! + f * dx - p.x, course.y[i]! + f * dy - p.y);
    if (d < best.d) best = { d, dx, dy };
  }
  return best;
}
