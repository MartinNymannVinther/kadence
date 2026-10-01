import { describe, expect, it } from "vitest";
import da from "../../messages/da.json";
import en from "../../messages/en.json";
import { STRENGTH_PROGRAMMES } from "@/modules/dcu/strength";
import { BUILDING_BLOCKS, placeBlock } from "@/modules/workouts/building-blocks";
import { EXERCISE_CATALOGUE } from "@/modules/workouts/exercise-catalogue";
import {
  bikeStructureSchema,
  exerciseSchema,
  structureMinutes,
  type BikeStructure,
} from "@/modules/workouts/structure";

/**
 * The builder's starting points (ADR 0044): every building block is a
 * session part the builder's own schema accepts and lands where it
 * belongs, and the exercise catalogue holds DCU's exercises as the
 * programmes do them, once each, beside Kadence's own.
 */

const block = (key: string) => BUILDING_BLOCKS.find((b) => b.key === key)!;

describe("the building blocks", () => {
  it("are each a valid part of a bike session", () => {
    for (const b of BUILDING_BLOCKS)
      expect(bikeStructureSchema.safeParse({ kind: "bike", steps: [b.item] }).success).toBe(true);
  });

  it("are the sets they are named for", () => {
    const minutes = (key: string) =>
      structureMinutes({ kind: "bike", steps: [block(key).item] } as BikeStructure);
    expect(minutes("warmup")).toBe(15);
    expect(minutes("threshold")).toBe(2 * (15 + 5));
    expect(minutes("vo2")).toBe(5 * (4 + 3));
  });

  it("land where they belong: a warm-up first, work before the cool-down, a cool-down last", () => {
    let steps: BikeStructure["steps"] = [];
    steps = placeBlock(steps, block("cooldown"));
    steps = placeBlock(steps, block("threshold"));
    steps = placeBlock(steps, block("warmup"));
    steps = placeBlock(steps, block("sprint"));
    expect(
      steps.map((s) => (s.kind === "step" ? s.intent : `${s.times}×${s.steps[0]!.seconds}`)),
    ).toEqual(["warmup", "2×900", "6×10", "cooldown"]);
  });
});

describe("the exercise catalogue", () => {
  it("holds every DCU exercise once, as its programme does it", () => {
    const dcu = EXERCISE_CATALOGUE.filter((e) => e.name !== null);
    const names = dcu.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
    for (const programme of Object.values(STRENGTH_PROGRAMMES))
      for (const e of programme.structure.exercises) expect(names).toContain(e.name);
    expect(dcu.find((e) => e.name === "Benpres")).toMatchObject({
      sets: 3,
      reps: "16",
      load: "RM",
    });
  });

  it("gives Kadence's own a key to be named by, and a valid exercise", () => {
    const own = EXERCISE_CATALOGUE.filter((e) => e.key !== null);
    expect(own.length).toBeGreaterThan(10);
    for (const e of own)
      expect(
        exerciseSchema.safeParse({ name: e.key, group: e.group, sets: e.sets, reps: e.reps })
          .success,
      ).toBe(true);
  });
});

describe("their words", () => {
  it("name every block and every catalogue exercise of Kadence's own, in both languages", () => {
    for (const messages of [da, en]) {
      for (const b of BUILDING_BLOCKS)
        expect(messages.workouts.blocks[b.key as "warmup"]).toBeTruthy();
      for (const e of EXERCISE_CATALOGUE.filter((x) => x.key !== null)) {
        expect(messages.workouts.catalogue.names[e.key as "plank"]).toBeTruthy();
        if (e.loadKey) expect(messages.workouts.catalogue.loads[e.loadKey]).toBeTruthy();
      }
    }
  });
});
