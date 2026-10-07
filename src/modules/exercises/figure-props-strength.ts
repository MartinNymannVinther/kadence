import { FIGURE, line, type FigurePrimitive, type XY } from "./figure-style";
import type { Prop } from "./types";

/**
 * The strength room's props as primitives (backlog Ø-06): a barbell, a
 * dumbbell, TRX straps and a pull-up bar, in the same quiet prop tone and
 * strokes as the rest (./figure-props.ts). Every one is lines and circles
 * only, so the bounds the tests and the editor measure by
 * (`primitiveBounds`) are exact: a thick line's round caps reach half its
 * width past its ends, as its bounds say.
 *
 * Pure: numbers in, numbers out.
 */

/** A unit vector at `degrees` clockwise from level (y runs downwards). */
function direction(degrees: number): XY {
  const radians = (degrees * Math.PI) / 180;
  return [Math.cos(radians), Math.sin(radians)];
}

const plus = ([x, y]: XY, [dx, dy]: XY, by: number): XY => [x + dx * by, y + dy * by];
/** At right angles to a direction. */
const across = ([dx, dy]: XY): XY => [-dy, dx];

/** A short thick line across `u` at `at`: a plate, a dumbbell's end, a handle's grip. */
function crossbar(at: XY, u: XY, half: number, width: number): FigurePrimitive {
  const n = across(u);
  return line("prop", [plus(at, n, -half), plus(at, n, half)], width);
}

/** The bar across the drawing, a plate at each end: the gym's own pictogram, seen from the side or the front. */
function barbell(p: Extract<Prop, { kind: "barbell" }>): FigurePrimitive[] {
  const b = FIGURE.barbell;
  const u = direction(p.angle ?? 0);
  return [
    line("prop", [plus(p.at, u, -b.half), plus(p.at, u, b.half)], FIGURE.propStroke),
    crossbar(plus(p.at, u, -b.plateAt), u, b.plateHalf, b.plateWidth),
    crossbar(plus(p.at, u, b.plateAt), u, b.plateHalf, b.plateWidth),
  ];
}

function dumbbell(p: Extract<Prop, { kind: "dumbbell" }>): FigurePrimitive[] {
  const d = FIGURE.dumbbell;
  const u = direction(p.angle ?? 0);
  return [
    line("prop", [plus(p.at, u, -d.half), plus(p.at, u, d.half)], FIGURE.propStroke),
    crossbar(plus(p.at, u, -d.half), u, d.endHalf, d.endWidth),
    crossbar(plus(p.at, u, d.half), u, d.endHalf, d.endWidth),
  ];
}

/** The far strap fainter, as the far arm and leg are; each handle a grip across its strap. */
function trx(p: Extract<Prop, { kind: "trx" }>): FigurePrimitive[] {
  const t = FIGURE.trx;
  const strap = (handle: XY, opacity: number): FigurePrimitive[] => {
    const length = Math.hypot(handle[0] - p.anchor[0], handle[1] - p.anchor[1]) || 1;
    const u: XY = [(handle[0] - p.anchor[0]) / length, (handle[1] - p.anchor[1]) / length];
    return [
      line("prop", [p.anchor, handle], t.strap, opacity),
      { ...crossbar(handle, u, t.grip, FIGURE.propStroke), opacity },
    ];
  };
  return [
    ...strap(p.handleB, FIGURE.farOpacity),
    ...strap(p.handleA, 1),
    {
      shape: "circle",
      tone: "prop",
      center: p.anchor,
      r: t.ring,
      fill: false,
      width: t.strap,
      opacity: 1,
    },
  ];
}

/** The bar, and a bracket up from each end that holds it. */
function pullupBar(p: Extract<Prop, { kind: "pullupBar" }>): FigurePrimitive[] {
  const b = FIGURE.pullupBar;
  const [x, y] = p.at;
  const ends = [x - p.width / 2, x + p.width / 2] as const;
  return [
    line(
      "prop",
      [
        [ends[0], y],
        [ends[1], y],
      ],
      b.stroke,
    ),
    ...ends.map((end) =>
      line(
        "prop",
        [
          [end, y],
          [end, y - b.mount],
        ],
        FIGURE.propStroke,
      ),
    ),
  ];
}

export function strengthPropPrimitives(p: Prop): FigurePrimitive[] {
  switch (p.kind) {
    case "barbell":
      return barbell(p);
    case "dumbbell":
      return dumbbell(p);
    case "trx":
      return trx(p);
    case "pullupBar":
      return pullupBar(p);
    default:
      return [];
  }
}
