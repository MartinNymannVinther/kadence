import { FIGURE } from "./figure";
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
] as const satisfies ReadonlyArray<Prop["kind"]>;

/** The contract's limit (`poseSchema`). */
export const MAX_PROPS = 6;
/** One of each: two floors or two walls say nothing a drawing needs. */
const ONCE: ReadonlySet<Prop["kind"]> = new Set(["floor", "wall"]);

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
      return { kind, at: [x(0) + (right ? -12 : 12), floor - 14], radius: 12 };
    case "kettlebell":
      return { kind, at: [x(0) + (right ? -8 : 8), floor - 18] };
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

export function removeProp(pose: Pose, index: number): Pose {
  return { ...pose, props: (pose.props ?? []).filter((_, i) => i !== index) };
}

/** Which handle of a prop: its one point, or one of its two ends. */
export type PropHandle = "at" | "from" | "to";

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
      return [{ handle: "at", at: prop.at }];
  }
}

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
  }
}

export function movePropHandle(pose: Pose, index: number, handle: PropHandle, to: Point): Pose {
  const props = pose.props ?? [];
  const prop = props[index];
  if (!prop) return pose;
  const moved = movedProp(prop, handle, to, floorY(pose));
  return keepInside(pose, { ...pose, props: props.map((p, i) => (i === index ? moved : p)) });
}

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
      return { ...prop, at: flip(prop.at) };
  }
}
