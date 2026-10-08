import { FIGURE, figureGeometry, geometryBounds } from "./figure";
import { BOX, type Joint, type Point, type Pose } from "./types";

/**
 * What keeps a coach's drawing inside its box (the pose editor,
 * src/components/exercises/editor): a point is clamped to the box less
 * the paint around it, and a whole pose fits when everything it paints —
 * strokes, the head, the arrowheads, a bent arrow's curve — does
 * (`geometryBounds`, the same measure the tests hold Kadence's own to).
 *
 * Pure: numbers in, numbers out.
 */

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** The point, rounded to whole units and kept `margin` inside the box (`bottom` at the floor). */
export function clampPoint(
  [x, y]: Point,
  margin: number,
  bottom: number = margin,
  side: number = margin,
): Point {
  return [
    Math.round(clamp(x, side, BOX.width - side)),
    Math.round(clamp(y, margin, BOX.height - bottom)),
  ];
}

/** How far a joint's paint reaches round it: the head's circle, or half a limb's stroke. */
export function jointMargin(joint: Joint): number {
  return joint === "head" ? FIGURE.headRadius : Math.ceil(FIGURE.stroke / 2);
}

/** How far an arrow's end reaches: its head's sides, and half its stroke. */
export const ARROW_MARGIN = FIGURE.arrowHead + Math.ceil(FIGURE.arrowStroke / 2);

/** Whether everything the pose paints lies inside the box. */
export function fits(pose: Pose): boolean {
  const b = geometryBounds(figureGeometry(pose));
  return b.minX >= 0 && b.minY >= 0 && b.maxX <= BOX.width && b.maxY <= BOX.height;
}

/**
 * The edited pose when it fits, else the pose before the edit — unless
 * that did not fit either (a pose saved before these rules), when the
 * edit is let through so the coach can mend it.
 */
export function keepInside(before: Pose, after: Pose): Pose {
  return fits(after) || !fits(before) ? after : before;
}
