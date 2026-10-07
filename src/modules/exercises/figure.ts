import { groundPrimitives, propPrimitives } from "./figure-props";
import { FIGURE, line, type FigurePrimitive, type XY } from "./figure-style";
import type { Arrow, Pose } from "./types";

/**
 * One drawing for every exercise (docs/plan-ovelser-og-programmer.md): a
 * pose becomes a short list of primitives — circles, polylines, a curve,
 * rectangles — in the 240 × 140 box, and two thin renderers paint the same
 * list: `figureSvg` as a self-contained string for the downloaded file and
 * `ExerciseFigure` with Kadence's tokens on the page and in the app. The
 * style is fixed in ./figure-style; the ground and props are ./figure-props.
 *
 * Pure: numbers in, numbers out.
 */

export { FIGURE, FIGURE_TONES } from "./figure-style";
export type { FigurePrimitive, FigureTone, XY } from "./figure-style";

/** The control point of a bent arrow: `bend` 1 bulges half the arrow's length to its left. */
export function arrowControl(arrow: Arrow): XY {
  const [x1, y1] = arrow.from;
  const [x2, y2] = arrow.to;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const bend = arrow.bend ?? 0;
  // (dy, -dx) is the arrow's left in a box whose y runs downwards.
  return [(x1 + x2) / 2 + (dy * bend) / 2, (y1 + y2) / 2 - (dx * bend) / 2];
}

/** A shaft — straight, or curved when bent — and an open head at `to`. */
function arrowPrimitives(arrow: Arrow): FigurePrimitive[] {
  const bend = arrow.bend ?? 0;
  const [tx, ty] = arrow.to;
  const control = arrowControl(arrow);
  // The head points along the shaft's last direction: the chord, or the
  // curve's tangent at its end.
  const [bx, by] = bend === 0 ? arrow.from : control;
  const length = Math.hypot(tx - bx, ty - by) || 1;
  const ux = (tx - bx) / length;
  const uy = (ty - by) / length;
  const h = FIGURE.arrowHead;
  const side = (sign: 1 | -1): XY => {
    const cos = Math.cos(FIGURE.arrowHeadAngle);
    const sin = Math.sin(FIGURE.arrowHeadAngle) * sign;
    // The shaft's direction turned back by the head's angle.
    return [tx - h * (ux * cos - uy * sin), ty - h * (uy * cos + ux * sin)];
  };
  const paint = { tone: "accent", width: FIGURE.arrowStroke, opacity: 1 } as const;
  const shaft: FigurePrimitive =
    bend === 0
      ? line("accent", [arrow.from, arrow.to], FIGURE.arrowStroke)
      : { ...paint, shape: "curve", from: arrow.from, control, to: arrow.to };
  return [shaft, line("accent", [side(1), arrow.to, side(-1)], FIGURE.arrowStroke)];
}

/**
 * The figure as primitives, in the order they are painted: ground, props,
 * the far limbs, the torso and neck, the near limbs, the head, the arrows.
 */
export function figureGeometry(pose: Pose): FigurePrimitive[] {
  const j = pose.joints;
  const hidden = new Set(pose.hidden ?? []);
  const props = pose.props ?? [];
  const limbs = {
    armA: [j.neck, j.elbowA, j.handA],
    armB: [j.neck, j.elbowB, j.handB],
    legA: [j.hip, j.kneeA, j.footA],
    legB: [j.hip, j.kneeB, j.footB],
  } as const;
  const limb = (key: keyof typeof limbs): FigurePrimitive[] =>
    hidden.has(key)
      ? []
      : [line("ink", limbs[key], FIGURE.stroke, key.endsWith("B") ? FIGURE.farOpacity : 1)];

  return [
    ...groundPrimitives(props),
    ...propPrimitives(props),
    ...limb("legB"),
    ...limb("armB"),
    // The neck runs from the head's centre; the filled head covers its start.
    line("ink", [j.head, j.neck, j.hip], FIGURE.stroke),
    ...limb("legA"),
    ...limb("armA"),
    {
      shape: "circle",
      tone: "ink",
      center: j.head,
      r: FIGURE.headRadius,
      fill: true,
      width: 0,
      opacity: 1,
    },
    ...(pose.arrows ?? []).flatMap(arrowPrimitives),
  ];
}

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

/** Where a primitive's paint reaches, strokes included; a curve by its control polygon. */
export function primitiveBounds(p: FigurePrimitive): Bounds {
  const grow = (points: readonly XY[], by: number): Bounds => ({
    minX: Math.min(...points.map((q) => q[0])) - by,
    minY: Math.min(...points.map((q) => q[1])) - by,
    maxX: Math.max(...points.map((q) => q[0])) + by,
    maxY: Math.max(...points.map((q) => q[1])) + by,
  });
  switch (p.shape) {
    case "polyline":
      return grow(p.points, p.width / 2);
    case "curve":
      return grow([p.from, p.control, p.to], p.width / 2);
    case "circle":
      return grow([p.center], p.r + (p.fill ? 0 : p.width / 2));
    case "rect":
      return grow(
        [
          [p.x, p.y],
          [p.x + p.w, p.y + p.h],
        ],
        p.fill ? 0 : p.width / 2,
      );
  }
}

/** Where the whole drawing reaches. */
export function geometryBounds(primitives: readonly FigurePrimitive[]): Bounds {
  const all = primitives.map(primitiveBounds);
  return {
    minX: Math.min(...all.map((b) => b.minX)),
    minY: Math.min(...all.map((b) => b.minY)),
    maxX: Math.max(...all.map((b) => b.maxX)),
    maxY: Math.max(...all.map((b) => b.maxY)),
  };
}
