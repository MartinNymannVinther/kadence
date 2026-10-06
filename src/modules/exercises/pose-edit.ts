import { arrowControl } from "./figure";
import { ARROW_MARGIN, clampPoint, jointMargin, keepInside } from "./pose-fit";
import { mirrorProp, movePropHandle, propHandles, type PropHandle } from "./pose-props";
import { BOX, JOINTS, type Arrow, type Joint, type Limb, type Point, type Pose } from "./types";

/**
 * What the pose editor does to a pose (src/components/exercises/editor):
 * move a joint, an arrow's end or a prop by a pointer or the arrow keys,
 * bend an arrow, add and take away arrows, hide a limb, mirror the whole
 * drawing. Every edit returns a new pose that still fits its box
 * (./pose-fit.ts) and the contract (`poseSchema`); an edit that would not
 * fit leaves the pose as it was.
 *
 * Pure: numbers in, numbers out.
 */

/** What is being moved: a joint, one end of an arrow, or a prop's handle. */
export type Selection =
  | { kind: "joint"; joint: Joint }
  | { kind: "arrow"; index: number; end: "from" | "to" }
  | { kind: "prop"; index: number; handle: PropHandle };

/** The contract's limit (`poseSchema`). */
export const MAX_ARROWS = 3;

/** The limb each joint belongs to; head, neck and hip belong to none. */
const LIMB_OF: Partial<Record<Joint, Limb>> = {
  elbowA: "armA",
  handA: "armA",
  elbowB: "armB",
  handB: "armB",
  kneeA: "legA",
  footA: "legA",
  kneeB: "legB",
  footB: "legB",
};

export function moveJoint(pose: Pose, joint: Joint, to: Point): Pose {
  const point = clampPoint(to, jointMargin(joint));
  return keepInside(pose, { ...pose, joints: { ...pose.joints, [joint]: point } });
}

/**
 * The arrow with its bend eased towards straight until its curve stays
 * inside the box, so moving an end near an edge never throws the curve out.
 */
function withFittingBend(arrow: Arrow): Arrow {
  let bend = arrow.bend ?? 0;
  for (let i = 0; i < 40 && bend !== 0; i++) {
    const [cx, cy] = arrowControl({ ...arrow, bend });
    if (cx >= 2 && cy >= 2 && cx <= BOX.width - 2 && cy <= BOX.height - 2) break;
    bend = Math.abs(bend) < 0.05 ? 0 : Math.round(bend * 0.9 * 100) / 100;
  }
  return { ...arrow, bend };
}

function replaceArrow(pose: Pose, index: number, arrow: Arrow): Pose {
  const arrows = (pose.arrows ?? []).map((a, i) => (i === index ? withFittingBend(arrow) : a));
  return keepInside(pose, { ...pose, arrows });
}

export function moveArrowEnd(pose: Pose, index: number, end: "from" | "to", to: Point): Pose {
  const arrow = pose.arrows?.[index];
  if (!arrow) return pose;
  return replaceArrow(pose, index, { ...arrow, [end]: clampPoint(to, ARROW_MARGIN) });
}

/** A bend from -1 to 1, in steps of a twentieth. */
export function setBend(pose: Pose, index: number, bend: number): Pose {
  const arrow = pose.arrows?.[index];
  if (!arrow) return pose;
  const value = Math.round(Math.min(1, Math.max(-1, bend)) * 20) / 20;
  return replaceArrow(pose, index, { ...arrow, bend: value });
}

/** A new straight arrow above the figure, each a little lower than the last. */
export function addArrow(pose: Pose): Pose {
  const arrows = pose.arrows ?? [];
  if (arrows.length >= MAX_ARROWS) return pose;
  const y = 18 + arrows.length * 18;
  const arrow: Arrow = { from: [100, y], to: [140, y], bend: 0 };
  return keepInside(pose, { ...pose, arrows: [...arrows, arrow] });
}

export function removeArrow(pose: Pose, index: number): Pose {
  return { ...pose, arrows: (pose.arrows ?? []).filter((_, i) => i !== index) };
}

/** Hides a limb behind the body, or shows it again. */
export function toggleLimb(pose: Pose, limb: Limb): Pose {
  const hidden = pose.hidden ?? [];
  return {
    ...pose,
    hidden: hidden.includes(limb) ? hidden.filter((l) => l !== limb) : [...hidden, limb],
  };
}

/**
 * The drawing seen in a mirror: the figure faces the other way, the props
 * swap sides, and an arrow bends to the other side of its line. Twice is
 * the drawing as it was.
 */
export function mirrorPose(pose: Pose): Pose {
  const flip = ([x, y]: Point): Point => [BOX.width - x, y];
  return {
    ...pose,
    joints: Object.fromEntries(
      JOINTS.map((joint) => [joint, flip(pose.joints[joint])]),
    ) as Pose["joints"],
    props: (pose.props ?? []).map(mirrorProp),
    arrows: (pose.arrows ?? []).map((a) => ({
      from: flip(a.from),
      to: flip(a.to),
      bend: a.bend ? -a.bend : 0,
    })),
  };
}

/** Where a selection is in the box, or null when it no longer names anything. */
export function selectionPoint(pose: Pose, selection: Selection): Point | null {
  switch (selection.kind) {
    case "joint":
      return pose.joints[selection.joint];
    case "arrow":
      return pose.arrows?.[selection.index]?.[selection.end] ?? null;
    case "prop": {
      const prop = pose.props?.[selection.index];
      if (!prop) return null;
      return propHandles(prop).find((h) => h.handle === selection.handle)?.at ?? null;
    }
  }
}

/** Moves whatever is selected to `to`. */
export function moveSelection(pose: Pose, selection: Selection, to: Point): Pose {
  switch (selection.kind) {
    case "joint":
      return moveJoint(pose, selection.joint, to);
    case "arrow":
      return moveArrowEnd(pose, selection.index, selection.end, to);
    case "prop":
      return movePropHandle(pose, selection.index, selection.handle, to);
  }
}

/** The keyboard's move: by `dx`, `dy` units from where the selection is. */
export function nudge(pose: Pose, selection: Selection, dx: number, dy: number): Pose {
  const at = selectionPoint(pose, selection);
  return at ? moveSelection(pose, selection, [at[0] + dx, at[1] + dy]) : pose;
}

/**
 * Every handle the editor draws, in the order the keyboard reaches them:
 * the joints from the head down — those of a hidden limb left out — then
 * the arrows' ends, then the props.
 */
export function handlesOf(pose: Pose): Array<{ selection: Selection; at: Point }> {
  const hidden = new Set(pose.hidden ?? []);
  const joints = JOINTS.filter((joint) => {
    const limb = LIMB_OF[joint];
    return !limb || !hidden.has(limb);
  }).map((joint) => ({
    selection: { kind: "joint", joint } as Selection,
    at: pose.joints[joint],
  }));
  const arrows = (pose.arrows ?? []).flatMap((arrow, index) =>
    (["from", "to"] as const).map((end) => ({
      selection: { kind: "arrow", index, end } as Selection,
      at: arrow[end],
    })),
  );
  const props = (pose.props ?? []).flatMap((prop, index) =>
    propHandles(prop).map(({ handle, at }) => ({
      selection: { kind: "prop", index, handle } as Selection,
      at,
    })),
  );
  return [...joints, ...arrows, ...props];
}

/**
 * The handle a pointer picks up at `at`: the selected one when it is
 * within `radius`, so a joint lying on another can be taken once chosen
 * by the keyboard; else the nearest within `radius`; else none.
 */
export function nearestHandle(
  pose: Pose,
  at: Point,
  radius: number,
  selected: Selection | null = null,
): { selection: Selection; at: Point } | null {
  const distance = (p: Point) => Math.hypot(p[0] - at[0], p[1] - at[1]);
  let best: { selection: Selection; at: Point } | null = null;
  for (const handle of handlesOf(pose)) {
    const d = distance(handle.at);
    if (d > radius) continue;
    if (sameSelection(handle.selection, selected)) return handle;
    if (!best || d < distance(best.at)) best = handle;
  }
  return best;
}

/** Whether two selections name the same thing. */
export function sameSelection(a: Selection | null, b: Selection | null): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The undo stack: the newest last, at most `limit` deep. */
export function pushHistory(stack: readonly Pose[], pose: Pose, limit = 50): Pose[] {
  const next = [...stack, pose];
  return next.length > limit ? next.slice(next.length - limit) : next;
}
