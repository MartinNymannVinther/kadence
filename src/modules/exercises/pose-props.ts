import { FIGURE, geometryBounds } from "./figure";
import { propPrimitives } from "./figure-props";
import { clampPoint, keepInside } from "./pose-fit";
import { BOX, type Point, type Pose, type Prop } from "./types";

/**
 * The props in the pose editor: where a new one is put, the handles it is
 * moved by, and how a handle moves it — each kind kept inside the box by
 * what it paints (src/modules/exercises/figure-props.ts).
 *
 * Pure: numbers in, numbers out.
 */

export const PROP_KINDS = [
  "floor",
  "wall",
  "mat",
  "bench",
  "step",
  "band",
  "ball",
  "kettlebell",
  "barbell",
  "dumbbell",
  "trx",
  "pullupBar",
] as const satisfies ReadonlyArray<Prop["kind"]>;

/** The contract's limit (`poseSchema`). */
export const MAX_PROPS = 6;
/** One of each: two floors, two walls or two barbells say nothing a drawing needs. */
const ONCE: ReadonlySet<Prop["kind"]> = new Set(["floor", "wall", "barbell", "trx", "pullupBar"]);

/** The floor a pose stands on, or where it would be. */
export function floorY(pose: Pose): number {
  for (const p of pose.props ?? []) if (p.kind === "floor") return p.y;
  return 122;
}

/** A new prop of the kind, placed on the floor at the side the figure leaves free. */
export function defaultProp(kind: Prop["kind"], pose: Pose): Prop {
  const floor = floorY(pose);
  const right = pose.joints.hip[0] < BOX.width / 2;
  const x = (width: number) => (right ? BOX.width - 30 - width : 30);
  const inward = (by: number) => x(0) + (right ? -by : by);
  switch (kind) {
    case "floor":
      return { kind, y: 122 };
    case "wall":
      return { kind, x: right ? BOX.width - 20 : 20 };
    case "mat":
      return { kind, from: [40, floor - 2], to: [200, floor - 2] };
    case "bench":
      return { kind, at: [x(50), floor - 22], width: 50, height: 22 };
    case "step":
      return { kind, at: [x(40), floor - 12], width: 40 };
    case "band":
      return { kind, from: [x(70), 60], to: [x(70) + 70, 60] };
    case "ball":
      return { kind, at: [inward(12), floor - 14], radius: 12 };
    case "kettlebell":
      return { kind, at: [inward(8), floor - 18] };
    case "barbell":
      // Lying on the floor, its plates on the floor.
      return { kind, at: [inward(16), floor - 14] };
    case "dumbbell":
      return { kind, at: [inward(10), floor - 8] };
    case "trx":
      // Hanging from above, the handles together at chest height.
      return {
        kind,
        anchor: [inward(10), 14],
        handleA: [inward(10), 70],
        handleB: [inward(10), 70],
      };
    case "pullupBar":
      return { kind, at: [inward(30), 14], width: 60 };
  }
}

/** Whether a prop of the kind may still be added. */
export function canAddProp(pose: Pose, kind: Prop["kind"]): boolean {
  const props = pose.props ?? [];
  return props.length < MAX_PROPS && !(ONCE.has(kind) && props.some((p) => p.kind === kind));
}

export function addProp(pose: Pose, kind: Prop["kind"]): Pose {
  if (!canAddProp(pose, kind)) return pose;
  return keepInside(pose, { ...pose, props: [...(pose.props ?? []), defaultProp(kind, pose)] });
}

/**
 * The barbell seen the other way: from the side (the near plate's disc,
 * the default, for a figure in profile) or from the front (the bar across
 * the figure with a plate at each end). Any other prop is left alone.
 */
export function turnBarbell(pose: Pose, index: number): Pose {
  const prop = pose.props?.[index];
  if (!prop || prop.kind !== "barbell") return pose;
  const view = (prop.view ?? "side") === "side" ? "front" : "side";
  const props = [...(pose.props ?? [])];
  props[index] = { ...prop, view };
  return { ...pose, props };
}

export function removeProp(pose: Pose, index: number): Pose {
  return { ...pose, props: (pose.props ?? []).filter((_, i) => i !== index) };
}

/** Which handle of a prop: its one point, one of its two ends, or a TRX's anchor and handles. */
export type PropHandle = "at" | "from" | "to" | "anchor" | "handleA" | "handleB";

/** The handles a prop is moved by, where they are drawn. */
export function propHandles(prop: Prop): Array<{ handle: PropHandle; at: Point }> {
  switch (prop.kind) {
    case "floor":
      return [{ handle: "at", at: [FIGURE.margin + 10, prop.y] }];
    case "wall":
      return [{ handle: "at", at: [prop.x, FIGURE.margin + 10] }];
    case "mat":
    case "band":
      return [
        { handle: "from", at: prop.from },
        { handle: "to", at: prop.to },
      ];
    case "bench":
    case "step":
      // The middle of the top: where a hand would pick it up.
      return [{ handle: "at", at: [prop.at[0] + prop.width / 2, prop.at[1]] }];
    case "ball":
    case "kettlebell":
    case "barbell":
    case "dumbbell":
    case "pullupBar":
      return [{ handle: "at", at: prop.at }];
    case "trx":
      return [
        { handle: "anchor", at: prop.anchor },
        { handle: "handleA", at: prop.handleA },
        { handle: "handleB", at: prop.handleB },
      ];
  }
}

/** The prop moved by `dx`, `dy` units, every point of it. */
export function shiftProp(prop: Prop, dx: number, dy: number): Prop {
  const move = ([x, y]: Point): Point => [x + dx, y + dy];
  switch (prop.kind) {
    case "floor":
      return { ...prop, y: prop.y + dy };
    case "wall":
      return { ...prop, x: prop.x + dx };
    case "mat":
    case "band":
      return { ...prop, from: move(prop.from), to: move(prop.to) };
    case "bench":
    case "step":
    case "ball":
    case "kettlebell":
    case "barbell":
    case "dumbbell":
    case "pullupBar":
      return { ...prop, at: move(prop.at) };
    case "trx":
      return {
        ...prop,
        anchor: move(prop.anchor),
        handleA: move(prop.handleA),
        handleB: move(prop.handleB),
      };
  }
}

/** A prop held by one point, moved to `to` and then back inside the box by what it paints. */
function placedInside(prop: Extract<Prop, { at: Point }>, to: Point): Prop {
  const moved = shiftProp(prop, Math.round(to[0]) - prop.at[0], Math.round(to[1]) - prop.at[1]);
  const b = geometryBounds(propPrimitives([moved]));
  const back = (low: number, high: number, max: number) =>
    low < 0 ? Math.ceil(-low) : high > max ? Math.floor(max - high) : 0;
  return shiftProp(moved, back(b.minX, b.maxX, BOX.width), back(b.minY, b.maxY, BOX.height));
}

/** How far a TRX's anchor ring and a handle's grip reach round their points. */
const TRX_MARGIN = {
  anchor: FIGURE.trx.ring + FIGURE.trx.strap,
  handle: FIGURE.trx.grip + FIGURE.propStroke,
} as const;

/** The prop with the handle moved to `to`, kept inside the box by what it paints. */
function movedProp(prop: Prop, handle: PropHandle, to: Point, floor: number): Prop {
  const [x, y] = to;
  switch (prop.kind) {
    case "floor":
      return { ...prop, y: clampPoint([0, y], 20, 2)[1] };
    case "wall":
      return { ...prop, x: clampPoint([x, 0], 0, 0, 2)[0] };
    case "mat":
    case "band":
      return { ...prop, [handle === "to" ? "to" : "from"]: clampPoint(to, 2) };
    case "bench": {
      const [left, top] = clampPoint([x - prop.width / 2, y], 0, prop.height + 2, 0);
      return { ...prop, at: [Math.min(left, BOX.width - prop.width), top] };
    }
    case "step": {
      const below = floor > y ? 2 : FIGURE.stepHeight + 2;
      const [left, top] = clampPoint([x - prop.width / 2, y], 2, below, 0);
      return { ...prop, at: [Math.min(left, BOX.width - prop.width), top] };
    }
    case "ball":
      return { ...prop, at: clampPoint(to, prop.radius + 2) };
    case "kettlebell": {
      const k = FIGURE.kettlebell;
      return { ...prop, at: clampPoint(to, k.handle + 2, k.drop + k.bell, k.bell) };
    }
    case "barbell":
    case "dumbbell":
    case "pullupBar":
      return placedInside(prop, to);
    case "trx": {
      if (handle === "anchor") return { ...prop, anchor: clampPoint(to, TRX_MARGIN.anchor) };
      const key = handle === "handleB" ? "handleB" : "handleA";
      return { ...prop, [key]: clampPoint(to, TRX_MARGIN.handle) };
    }
  }
}

export function movePropHandle(pose: Pose, index: number, handle: PropHandle, to: Point): Pose {
  const props = pose.props ?? [];
  const prop = props[index];
  if (!prop) return pose;
  const moved = movedProp(prop, handle, to, floorY(pose));
  return keepInside(pose, { ...pose, props: props.map((p, i) => (i === index ? moved : p)) });
}

/** An angle seen in a mirror: clockwise becomes anticlockwise, and none stays none. */
const mirrorAngle = (angle: number | undefined) => (angle === undefined ? angle : -angle || 0);

/** A prop seen in a mirror: the box's left is its right. */
export function mirrorProp(prop: Prop): Prop {
  const flip = ([x, y]: Point): Point => [BOX.width - x, y];
  switch (prop.kind) {
    case "floor":
      return prop;
    case "wall":
      return { ...prop, x: BOX.width - prop.x };
    case "mat":
    case "band":
      return { ...prop, from: flip(prop.from), to: flip(prop.to) };
    case "bench":
    case "step":
      // `at` is the top left; mirrored, the right edge becomes the left.
      return { ...prop, at: [BOX.width - prop.at[0] - prop.width, prop.at[1]] };
    case "ball":
    case "kettlebell":
    case "pullupBar":
      return { ...prop, at: flip(prop.at) };
    case "barbell":
    case "dumbbell": {
      const angle = mirrorAngle(prop.angle);
      return angle === undefined
        ? { ...prop, at: flip(prop.at) }
        : { ...prop, at: flip(prop.at), angle };
    }
    case "trx":
      return {
        ...prop,
        anchor: flip(prop.anchor),
        handleA: flip(prop.handleA),
        handleB: flip(prop.handleB),
      };
  }
}
