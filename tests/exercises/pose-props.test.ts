import { describe, expect, it } from "vitest";
import { BASE_POSES, basePose } from "@/modules/exercises/base-poses";
import { geometryBounds } from "@/modules/exercises/figure";
import { propPrimitives } from "@/modules/exercises/figure-props";
import { mirrorPose } from "@/modules/exercises/pose-edit";
import { fits } from "@/modules/exercises/pose-fit";
import {
  addProp,
  canAddProp,
  defaultProp,
  mirrorProp,
  movePropHandle,
  PROP_KINDS,
  propHandles,
  shiftProp,
} from "@/modules/exercises/pose-props";
import { BOX, EQUIPMENT, poseSchema, type Pose, type Prop } from "@/modules/exercises/types";

/**
 * The strength room's props in the pose editor (backlog Ø-06): a coach can
 * put a barbell, a dumbbell, TRX straps and a pull-up bar on a drawing,
 * move them by their handles and mirror them, and every edit keeps the
 * drawing inside its box and the contract — as the older props do
 * (tests/exercises/pose-edit.test.ts).
 */

const STRENGTH = ["barbell", "dumbbell", "trx", "pullupBar"] as const;

const valid = (pose: Pose) => {
  expect(poseSchema.safeParse(pose).success).toBe(true);
  expect(fits(pose)).toBe(true);
};

const bare = (key: (typeof BASE_POSES)[number] = "standing"): Pose => ({
  ...basePose(key),
  props: [{ kind: "floor", y: 122 }],
});

describe("the strength room's props in the editor", () => {
  it("are offered, each named as the equipment it ticks", () => {
    for (const kind of STRENGTH) {
      expect(PROP_KINDS).toContain(kind);
      expect(EQUIPMENT).toContain(kind);
    }
  });

  it("land inside the box beside every base pose", () => {
    for (const key of BASE_POSES)
      for (const kind of STRENGTH) {
        const pose = addProp(bare(key), kind);
        expect(pose.props?.at(-1)?.kind, `${key} ${kind}`).toBe(kind);
        valid(pose);
      }
  });

  it("come one barbell, one TRX and one bar at most, but dumbbells in pairs", () => {
    let pose = bare();
    for (const kind of STRENGTH) pose = addProp(addProp(pose, kind), kind);
    const count = (kind: Prop["kind"]) => pose.props!.filter((p) => p.kind === kind).length;
    expect(count("barbell")).toBe(1);
    expect(count("trx")).toBe(1);
    expect(count("pullupBar")).toBe(1);
    expect(count("dumbbell")).toBe(2);
    expect(canAddProp(pose, "barbell")).toBe(false);
  });

  it("move TRX straps by the anchor and each handle on its own", () => {
    let pose = addProp(bare(), "trx");
    const index = pose.props!.length - 1;
    expect(propHandles(pose.props![index]!).map((h) => h.handle)).toEqual([
      "anchor",
      "handleA",
      "handleB",
    ]);
    pose = movePropHandle(pose, index, "handleB", [80, 90]);
    const trx = pose.props![index] as Extract<Prop, { kind: "trx" }>;
    expect(trx.handleB).toEqual([80, 90]);
    expect(trx.handleA).not.toEqual([80, 90]);
    pose = movePropHandle(pose, index, "anchor", [-50, -50]);
    valid(pose);
  });

  it("slide a barbell along the edge rather than out of the box", () => {
    let pose = addProp(bare(), "barbell");
    const index = pose.props!.length - 1;
    pose = movePropHandle(pose, index, "at", [0, 60]);
    valid(pose);
    const bar = pose.props![index] as Extract<Prop, { kind: "barbell" }>;
    // It went as far left as its paint allows, at the height it was dragged to.
    expect(bar.at[1]).toBe(60);
    expect(geometryBounds(propPrimitives([bar])).minX).toBeGreaterThanOrEqual(0);
    expect(geometryBounds(propPrimitives([bar])).minX).toBeLessThan(1);
    pose = movePropHandle(pose, index, "at", [BOX.width, BOX.height]);
    valid(pose);
  });

  it("turn the other way in a mirror, and back again", () => {
    const tilted: Prop = { kind: "dumbbell", at: [60, 70], angle: 20 };
    expect(mirrorProp(tilted)).toEqual({ kind: "dumbbell", at: [BOX.width - 60, 70], angle: -20 });
    expect(mirrorProp(mirrorProp(tilted))).toEqual(tilted);
    const level: Prop = { kind: "barbell", at: [60, 70] };
    expect(mirrorProp(level)).toEqual({ kind: "barbell", at: [BOX.width - 60, 70] });
    let pose = bare();
    for (const kind of STRENGTH) pose = addProp(pose, kind);
    valid(mirrorPose(pose));
    expect(mirrorPose(mirrorPose(pose))).toEqual(pose);
  });

  it("move every point of a prop together", () => {
    const trx: Prop = { kind: "trx", anchor: [60, 12], handleA: [100, 70], handleB: [104, 72] };
    expect(shiftProp(trx, 5, -2)).toEqual({
      kind: "trx",
      anchor: [65, 10],
      handleA: [105, 68],
      handleB: [109, 70],
    });
    for (const kind of PROP_KINDS) {
      const prop = defaultProp(kind, bare());
      expect(shiftProp(shiftProp(prop, 7, 3), -7, -3), kind).toEqual(prop);
    }
  });
});
