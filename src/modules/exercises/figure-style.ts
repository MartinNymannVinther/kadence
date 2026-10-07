/**
 * The figure's fixed style and the primitives it is drawn with
 * (src/modules/exercises/figure.ts). The style is fixed here, not in a
 * pose: a round filled head, thick limbs with round caps and joins, the
 * far arm and leg a little fainter, one accent for the arrows, hairline
 * ground and quiet props. A pose only says where things are.
 */

/** The fixed style, in the box's units. */
export const FIGURE = {
  /** Limbs and torso. */
  stroke: 4.5,
  headRadius: 10,
  /** The far arm and leg ("B") against the near ones. */
  farOpacity: 0.5,
  arrowStroke: 4,
  /** How far each side of an arrow's head reaches back from its tip. */
  arrowHead: 7,
  arrowHeadAngle: (38 * Math.PI) / 180,
  groundStroke: 3,
  propStroke: 3,
  bandStroke: 2,
  /** A step without a floor to stand on gets this height. */
  stepHeight: 12,
  benchSeat: 5,
  matStroke: 4,
  kettlebell: { handle: 4, bell: 7, drop: 9 },
  /** The floor and the wall leave this much of the box clear at each end. */
  margin: 10,
} as const;

/**
 * What a primitive is painted with. The renderers map these to colours:
 * the page to tokens, the download to the values it is handed.
 * ink — the figure · accent — the arrows · ground — floor and wall · prop — what is used.
 */
export const FIGURE_TONES = ["ink", "accent", "ground", "prop"] as const;
export type FigureTone = (typeof FIGURE_TONES)[number];

export type XY = readonly [number, number];

type Paint = { tone: FigureTone; width: number; opacity: number };

export type FigurePrimitive =
  | (Paint & { shape: "polyline"; points: readonly XY[] })
  /** A quadratic curve: a bent arrow's shaft. */
  | (Paint & { shape: "curve"; from: XY; control: XY; to: XY })
  /** Filled when `fill`; otherwise an outline `width` wide. */
  | (Paint & { shape: "circle"; center: XY; r: number; fill: boolean })
  | (Paint & {
      shape: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      radius: number;
      fill: boolean;
    });

export const line = (
  tone: FigureTone,
  points: readonly XY[],
  width: number,
  opacity = 1,
): FigurePrimitive => ({ shape: "polyline", tone, points, width, opacity });
