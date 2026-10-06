import { describe, expect, it } from "vitest";
import {
  flattenSteps,
  readStructure,
  resolveStrengthSession,
  strengthStructureSchema,
  structureMinutes,
  structureSchema,
  type BikeStructure,
  type StrengthStructure,
} from "@/modules/workouts/structure";

const intervals: BikeStructure = {
  kind: "bike",
  steps: [
    { kind: "step", intent: "warmup", seconds: 900, target: { kind: "zone", zone: 2 } },
    {
      kind: "repeat",
      times: 3,
      steps: [
        {
          kind: "step",
          intent: "work",
          seconds: 600,
          target: { kind: "ftp_pct", low: 91, high: 100 },
        },
        { kind: "step", intent: "recover", seconds: 300, target: { kind: "zone", zone: 1 } },
      ],
    },
    { kind: "step", intent: "cooldown", seconds: 600, target: { kind: "open" } },
  ],
};

describe("a bike session", () => {
  it("unrolls its repeats in riding order", () => {
    const steps = flattenSteps(intervals);
    expect(steps).toHaveLength(8);
    expect(steps.map((s) => s.intent)).toEqual([
      "warmup",
      "work",
      "recover",
      "work",
      "recover",
      "work",
      "recover",
      "cooldown",
    ]);
  });

  it("takes as long as its steps", () => {
    expect(structureMinutes(intervals)).toBe(15 + 3 * 15 + 10);
  });
});

describe("reading a stored structure", () => {
  it("reads the column's default as an empty bike session", () => {
    expect(readStructure({ steps: [] }, "bike")).toEqual({ kind: "bike", steps: [] });
  });

  it("reads rubbish as an empty session of the sport rather than failing", () => {
    expect(readStructure({ kind: "bike", steps: "x" }, "bike")).toEqual({
      kind: "bike",
      steps: [],
    });
    expect(readStructure(null, "strength").kind).toBe("strength");
    expect(readStructure(intervals, "other")).toEqual({ kind: "other", text: "", minutes: 0 });
  });
});

describe("a strength programme's progression", () => {
  const programme: StrengthStructure = {
    kind: "strength",
    warmup: "",
    minutes: 60,
    exercises: [
      { name: "Benpres", group: "legs", sets: 3, reps: "16", load: "", note: "" },
      { name: "Planke", group: "core", sets: 3, reps: "15-20", load: "RM", note: "" },
    ],
    progression: [
      { group: "legs", from: 1, to: 6, sets: 3, reps: "16", load: "" },
      { group: "legs", from: 7, to: 12, sets: 3, reps: "12", load: "" },
      { group: "legs", from: 13, to: null, sets: 4, reps: "6-8", load: "RM" },
    ],
  };

  it("gives each session the sets and reps of its rule", () => {
    expect(resolveStrengthSession(programme, 1)[0]).toMatchObject({ sets: 3, reps: "16" });
    expect(resolveStrengthSession(programme, 7)[0]).toMatchObject({ sets: 3, reps: "12" });
    expect(resolveStrengthSession(programme, 30)[0]).toMatchObject({
      sets: 4,
      reps: "6-8",
      load: "RM",
    });
  });

  it("leaves a group without rules as it is", () => {
    expect(resolveStrengthSession(programme, 13)[1]).toMatchObject({ sets: 3, reps: "15-20" });
  });
});

describe("an exercise's place in the library", () => {
  // A strength session as every one was written before an exercise could
  // name the library's exercise it is (docs/plan-ovelser-og-programmer.md).
  const before = {
    kind: "strength",
    warmup: "10 min på cyklen",
    minutes: 45,
    exercises: [
      { name: "Benpres", group: "legs", sets: 3, reps: "16", load: "RM", note: "" },
      { name: "Planke", group: "core", sets: 3, reps: "30 s", load: "", note: "", restSeconds: 60 },
    ],
    progression: [{ group: "legs", from: 1, to: null, sets: 3, reps: "12", load: "" }],
  } as const;

  it("leaves every session written before it as it was", () => {
    expect(strengthStructureSchema.parse(before)).toEqual(before);
    const read = strengthStructureSchema.parse(readStructure(before, "strength"));
    expect(read).toEqual(before);
    expect("ref" in read.exercises[0]!).toBe(false);
  });

  it("is kept when it names Kadence's own or a team's own exercise", () => {
    const withRefs = {
      ...before,
      exercises: [
        { ...before.exercises[0], ref: "builtin:squat" },
        { ...before.exercises[1], ref: "team:3f2c1a9e-8d7b-4c6a-9e5f-1a2b3c4d5e6f" },
      ],
    };
    const read = readStructure(withRefs, "strength");
    expect(read).toEqual(withRefs);
    expect(structureSchema.parse(withRefs)).toEqual(withRefs);
  });

  it("is dropped, not the session, when it does not read as a reference", () => {
    const odd = {
      ...before,
      exercises: [{ ...before.exercises[0], ref: "javascript:alert(1)" }, before.exercises[1]],
    };
    const read = readStructure(odd, "strength");
    expect(read.kind === "strength" && read.exercises).toHaveLength(2);
    expect(read.kind === "strength" && read.exercises[0]!.ref).toBeUndefined();
    expect(read.kind === "strength" && read.exercises[0]!.name).toBe("Benpres");
  });

  it("follows the exercise through the progression", () => {
    const structure = strengthStructureSchema.parse({
      ...before,
      exercises: [{ ...before.exercises[0], ref: "builtin:squat" }],
    });
    expect(resolveStrengthSession(structure, 5)[0]).toMatchObject({
      reps: "12",
      ref: "builtin:squat",
    });
  });
});
