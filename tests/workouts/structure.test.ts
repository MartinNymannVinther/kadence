import { describe, expect, it } from "vitest";
import {
  flattenSteps,
  readStructure,
  resolveStrengthSession,
  structureMinutes,
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
