import { builtinExercise } from "./builtin";
import { figureGeometry, geometryBounds } from "./figure";
import { shiftProp } from "./pose-props";
import { BOX, JOINTS, type Point, type Pose, type Prop } from "./types";

/**
 * Where a coach's own drawing starts: six base poses, each taken from one
 * of Kadence's own exercises (./builtin) — no drawing of its own. The
 * arrows go, the props go but the floor (and the bench a seated figure
 * sits on), and the figure is moved to the middle of the box. A seated
 * figure gets both feet on the floor: the figure four's crossed leg
 * follows the other one.
 *
 * Pure: numbers in, numbers out.
 */

export const BASE_POSES = ["standing", "kneeling", "back", "front", "seated", "side"] as const;
export type BasePose = (typeof BASE_POSES)[number];

const FROM: Record<BasePose, { exercise: string; keep: ReadonlyArray<Prop["kind"]> }> = {
  // Upright, arms down, back to where a wall was.
  standing: { exercise: "chinTuck", keep: ["floor"] },
  // Half kneeling, the hand on the hip.
  kneeling: { exercise: "hipFlexor", keep: ["floor"] },
  // On the back, knees bent.
  back: { exercise: "gluteBridge", keep: ["floor"] },
  // On the forearms, the body straight.
  front: { exercise: "plank", keep: ["floor"] },
  // On a bench, leaning a little forward.
  seated: { exercise: "figureFour", keep: ["floor", "bench"] },
  // Seen from the front, on one forearm.
  side: { exercise: "sidePlank", keep: ["floor"] },
};

const shift =
  (dx: number) =>
  ([x, y]: Point): Point => [x + dx, y];

/** The pose moved sideways so its drawing sits in the middle of the box. */
function centred(pose: Pose): Pose {
  const b = geometryBounds(figureGeometry({ ...pose, props: [] }));
  const dx = Math.round(BOX.width / 2 - (b.minX + b.maxX) / 2);
  const move = shift(dx);
  return {
    ...pose,
    joints: Object.fromEntries(
      JOINTS.map((joint) => [joint, move(pose.joints[joint])]),
    ) as Pose["joints"],
    props: (pose.props ?? []).map((p) => shiftProp(p, dx, 0)),
  };
}

export function basePose(key: BasePose): Pose {
  const { exercise, keep } = FROM[key];
  const source = builtinExercise(exercise);
  if (!source) throw new Error(`exercises: the base pose ${key} has no exercise ${exercise}`);
  const joints = structuredClone(source.pose.joints);
  if (key === "seated") {
    joints.kneeA = [...joints.kneeB];
    joints.footA = [...joints.footB];
  }
  return centred({
    joints,
    hidden: [...(source.pose.hidden ?? [])],
    props: structuredClone((source.pose.props ?? []).filter((p) => keep.includes(p.kind))),
    arrows: [],
  });
}
