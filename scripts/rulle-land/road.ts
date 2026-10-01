import type { Course } from "@/modules/rulle";
import type { P } from "./shapes";

/**
 * How far a place on the course's plane lies from the road, metres, for
 * the land script (ADR 0035): roughly, to every third of the road's
 * points — what decides whether a building far off is on the skyline —
 * and exactly, to the road's own line between its points.
 */
export function fromRoad(course: Course, p: P): number {
  let best = Infinity;
  for (let i = 0; i < course.x.length; i += 3)
    best = Math.min(best, Math.hypot(course.x[i]! - p.x, course.y[i]! - p.y));
  return best;
}

export function onRoad(course: Course, p: P): number {
  let best = Infinity;
  for (let i = 0; i + 1 < course.x.length; i++) {
    const dx = course.x[i + 1]! - course.x[i]!;
    const dy = course.y[i + 1]! - course.y[i]!;
    const along =
      ((p.x - course.x[i]!) * dx + (p.y - course.y[i]!) * dy) / (dx * dx + dy * dy || 1);
    const f = Math.max(0, Math.min(1, along));
    best = Math.min(best, Math.hypot(course.x[i]! + f * dx - p.x, course.y[i]! + f * dy - p.y));
  }
  return best;
}
