import { describe, expect, it } from "vitest";
import { BUILTIN_EXERCISES } from "@/modules/exercises/builtin";
import {
  doseSchema,
  exerciseRefSchema,
  poseSchema,
  programPartsSchema,
} from "@/modules/exercises/types";

describe("the exercises' contract", () => {
  it("holds every built-in pose and dose", () => {
    for (const e of BUILTIN_EXERCISES) {
      expect(poseSchema.safeParse(e.pose).success, e.id).toBe(true);
      expect(doseSchema.safeParse(e.dose).success, e.id).toBe(true);
    }
  });

  it("refers to an exercise by kind and id only", () => {
    expect(exerciseRefSchema.safeParse("builtin:hipFlexor").success).toBe(true);
    expect(exerciseRefSchema.safeParse("team:6f1c2a3b-0000-4000-8000-000000000000").success).toBe(
      true,
    );
    expect(exerciseRefSchema.safeParse("hipFlexor").success).toBe(false);
    expect(exerciseRefSchema.safeParse("team:../../etc").success).toBe(false);
  });

  it("lets a programme name each part once", () => {
    const item = { exercise: "builtin:hipFlexor" };
    expect(programPartsSchema.safeParse([{ key: "morning", items: [item] }]).success).toBe(true);
    expect(
      programPartsSchema.safeParse([
        { key: "morning", items: [item] },
        { key: "morning", items: [item] },
      ]).success,
    ).toBe(false);
  });

  it("says how heavy in a word, or not at all", () => {
    const dose = { kind: "reps", reps: 10, perSide: false, sets: 3 } as const;
    expect(doseSchema.parse(dose)).toEqual(dose);
    for (const load of ["light", "moderate", "heavy"])
      expect(doseSchema.safeParse({ ...dose, load }).success, load).toBe(true);
    expect(doseSchema.safeParse({ ...dose, load: "20 kg" }).success).toBe(false);
    expect(doseSchema.safeParse({ kind: "time", seconds: 30, load: "max" }).success).toBe(false);
  });

  it("keeps a figure inside its box", () => {
    const pose = structuredClone(BUILTIN_EXERCISES[0]!.pose);
    pose.joints.head = [300, 20];
    expect(poseSchema.safeParse(pose).success).toBe(false);
  });
});
