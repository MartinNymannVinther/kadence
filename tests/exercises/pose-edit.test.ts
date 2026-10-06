import { describe, expect, it } from "vitest";
import { BASE_POSES, basePose } from "@/modules/exercises/base-poses";
import { FIGURE } from "@/modules/exercises/figure";
import {
  addArrow,
  handlesOf,
  MAX_ARROWS,
  mirrorPose,
  moveArrowEnd,
  moveJoint,
  nearestHandle,
  nudge,
  removeArrow,
  setBend,
  toggleLimb,
} from "@/modules/exercises/pose-edit";
import { fits } from "@/modules/exercises/pose-fit";
import { poseHistory, type PoseHistory } from "@/modules/exercises/pose-history";
import {
  addProp,
  canAddProp,
  MAX_PROPS,
  movePropHandle,
  PROP_KINDS,
  propHandles,
} from "@/modules/exercises/pose-props";
import { BOX, JOINTS, poseSchema, type Pose } from "@/modules/exercises/types";

/**
 * The pose editor's arithmetic: the base poses it starts from, and every
 * edit — a drag, a key, a mirror, an arrow, a prop, an undo — keeps the
 * drawing inside its box and inside the contract.
 */

const valid = (pose: Pose) => {
  expect(poseSchema.safeParse(pose).success).toBe(true);
  expect(fits(pose)).toBe(true);
};

const standing = () => basePose("standing");

describe("the base poses", () => {
  it("are six, each a valid pose that fits its box, with no arrows", () => {
    expect(BASE_POSES).toHaveLength(6);
    for (const key of BASE_POSES) {
      const pose = basePose(key);
      valid(pose);
      expect(pose.arrows, key).toEqual([]);
      expect(
        pose.props?.some((p) => p.kind === "floor"),
        key,
      ).toBe(true);
    }
  });

  it("sit in the middle of the box", () => {
    for (const key of BASE_POSES) {
      const xs = JOINTS.map((j) => basePose(key).joints[j][0]);
      const middle = (Math.min(...xs) + Math.max(...xs)) / 2;
      expect(Math.abs(middle - BOX.width / 2), key).toBeLessThan(20);
    }
  });

  it("are fresh copies: editing one leaves the next untouched", () => {
    const a = basePose("kneeling");
    a.joints.head[0] = 1;
    expect(basePose("kneeling").joints.head[0]).not.toBe(1);
  });

  it("seat a figure with both feet on the floor and keep its bench", () => {
    const seated = basePose("seated");
    expect(seated.joints.footA).toEqual(seated.joints.footB);
    expect(seated.props?.map((p) => p.kind)).toEqual(["floor", "bench"]);
  });
});

describe("a dragged joint", () => {
  it("goes where it is dragged, in whole units", () => {
    const moved = moveJoint(standing(), "handA", [100.4, 40.6]);
    expect(moved.joints.handA).toEqual([100, 41]);
    valid(moved);
  });

  it("stops at the edge of the box, the head by its radius and a limb by its stroke", () => {
    let pose = moveJoint(standing(), "head", [-50, -50]);
    expect(pose.joints.head).toEqual([FIGURE.headRadius, FIGURE.headRadius]);
    valid(pose);
    pose = moveJoint(pose, "footA", [999, 999]);
    const margin = Math.ceil(FIGURE.stroke / 2);
    expect(pose.joints.footA).toEqual([BOX.width - margin, BOX.height - margin]);
    valid(pose);
  });
});

describe("the keyboard", () => {
  it("moves the chosen joint by the units it is told", () => {
    const pose = standing();
    const [x, y] = pose.joints.kneeA;
    expect(nudge(pose, { kind: "joint", joint: "kneeA" }, 1, 0).joints.kneeA).toEqual([x + 1, y]);
    expect(nudge(pose, { kind: "joint", joint: "kneeA" }, 0, -5).joints.kneeA).toEqual([x, y - 5]);
  });

  it("cannot push a joint out of the box however often it is pressed", () => {
    let pose = standing();
    for (let i = 0; i < 100; i++) pose = nudge(pose, { kind: "joint", joint: "head" }, 0, -5);
    expect(pose.joints.head[1]).toBe(FIGURE.headRadius);
    valid(pose);
  });

  it("moves an arrow's end and a prop's handle the same way", () => {
    let pose = addArrow(standing());
    const from = pose.arrows![0]!.from;
    pose = nudge(pose, { kind: "arrow", index: 0, end: "from" }, -3, 2);
    expect(pose.arrows![0]!.from).toEqual([from[0] - 3, from[1] + 2]);
    const floor = pose.props!.findIndex((p) => p.kind === "floor");
    pose = nudge(pose, { kind: "prop", index: floor, handle: "at" }, 0, -2);
    expect(pose.props![floor]).toEqual({ kind: "floor", y: 120 });
  });
});

describe("mirroring", () => {
  it("turns the figure, its props and its arrows the other way", () => {
    let pose = addProp(addArrow(basePose("seated")), "kettlebell");
    pose = setBend(pose, 0, 0.4);
    const mirrored = mirrorPose(pose);
    valid(mirrored);
    expect(mirrored.joints.head).toEqual([BOX.width - pose.joints.head[0], pose.joints.head[1]]);
    expect(mirrored.arrows![0]!.bend).toBe(-0.4);
    const bench = (p: Pose) =>
      p.props!.find((x) => x.kind === "bench") as { at: [number, number]; width: number };
    expect(bench(mirrored).at[0]).toBe(BOX.width - bench(pose).at[0] - bench(pose).width);
  });

  it("twice is the drawing as it was", () => {
    for (const key of BASE_POSES) {
      const pose = addProp(addArrow(basePose(key)), "band");
      expect(mirrorPose(mirrorPose(pose))).toEqual(pose);
    }
  });
});

describe("arrows", () => {
  it("are added up to three and taken away again", () => {
    let pose = standing();
    for (let i = 0; i < 5; i++) pose = addArrow(pose);
    expect(pose.arrows).toHaveLength(MAX_ARROWS);
    valid(pose);
    expect(removeArrow(pose, 1).arrows).toEqual([pose.arrows![0], pose.arrows![2]]);
  });

  it("bend in twentieths between -1 and 1", () => {
    const pose = addArrow(standing());
    expect(setBend(pose, 0, 0.333).arrows![0]!.bend).toBe(0.35);
    expect(setBend(pose, 0, 7).arrows![0]!.bend).toBeLessThanOrEqual(1);
  });

  it("straighten rather than throw their curve out of the box", () => {
    let pose = addArrow(standing());
    pose = setBend(pose, 0, 1);
    pose = moveArrowEnd(pose, 0, "from", [0, 0]);
    pose = moveArrowEnd(pose, 0, "to", [240, 0]);
    valid(pose);
    expect(Math.abs(pose.arrows![0]!.bend ?? 0)).toBeLessThan(1);
  });
});

describe("props", () => {
  it("come one floor and one wall at most, six in all, each inside the box", () => {
    let pose: Pose = { ...standing(), props: [] };
    for (const kind of PROP_KINDS) {
      pose = addProp(pose, kind);
      valid(pose);
    }
    expect(pose.props).toHaveLength(MAX_PROPS);
    expect(canAddProp(pose, "ball")).toBe(false);
    const one: Pose = { ...standing(), props: [{ kind: "floor", y: 122 }] };
    expect(canAddProp(one, "floor")).toBe(false);
    expect(addProp(one, "floor")).toBe(one);
  });

  it("are dragged by their handles and stay inside the box", () => {
    for (const kind of PROP_KINDS) {
      let pose = addProp({ ...standing(), props: [] }, kind);
      const index = pose.props!.length - 1;
      for (const { handle } of propHandles(pose.props![index]!)) {
        for (const to of [
          [-100, -100],
          [400, 300],
          [120, 70],
        ] as const) {
          pose = movePropHandle(pose, index, handle, [to[0], to[1]]);
          valid(pose);
        }
      }
    }
  });
});

describe("the handles", () => {
  it("leave out the joints of a hidden limb", () => {
    // Standing starts with the far arm behind the body.
    const pose = standing();
    expect(pose.hidden).toContain("armB");
    const all = toggleLimb(pose, "armB");
    const joints = (p: Pose) =>
      handlesOf(p)
        .filter((h) => h.selection.kind === "joint")
        .map((h) => (h.selection as { joint: string }).joint);
    expect(joints(all)).toContain("handB");
    expect(joints(pose)).not.toContain("handB");
    expect(joints(pose)).not.toContain("elbowB");
  });

  it("are picked up by the nearest, or by the chosen one when it is within reach", () => {
    const pose = standing();
    const head = pose.joints.head;
    expect(nearestHandle(pose, [head[0] + 2, head[1]], 14)?.selection).toEqual({
      kind: "joint",
      joint: "head",
    });
    expect(nearestHandle(pose, [0, 0], 5)).toBeNull();
    const neck = { kind: "joint", joint: "neck" } as const;
    expect(nearestHandle(pose, head, 30, neck)?.selection).toEqual(neck);
  });
});

describe("undo", () => {
  const start: PoseHistory = { pose: standing(), past: [] };

  it("keeps the pose before each edit, and none for an edit that changed nothing", () => {
    const moved = moveJoint(start.pose, "head", [100, 30]);
    const once = poseHistory(start, { type: "change", pose: moved });
    expect(once.past).toEqual([start.pose]);
    expect(poseHistory(once, { type: "change", pose: once.pose })).toBe(once);
    expect(poseHistory(once, { type: "undo" })).toEqual(start);
    expect(poseHistory(start, { type: "undo" })).toBe(start);
  });

  it("keeps one pose for a whole drag, and none for a drag that moved nothing", () => {
    let state = poseHistory(start, { type: "begin" });
    for (const x of [90, 95, 100])
      state = poseHistory(state, { type: "drag", pose: moveJoint(state.pose, "hip", [x, 60]) });
    state = poseHistory(state, { type: "end" });
    expect(state.past).toEqual([start.pose]);
    const still = poseHistory(poseHistory(start, { type: "begin" }), { type: "end" });
    expect(still.past).toEqual([]);
  });
});
