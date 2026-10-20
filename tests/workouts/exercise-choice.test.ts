import { describe, expect, it } from "vitest";
import {
  mergeChoices,
  renamed,
  untied,
  type ExerciseChoice,
} from "@/modules/workouts/exercise-choice";
import type { Exercise } from "@/modules/workouts/structure";

/**
 * The strength builder's names: the library's exercises come first and
 * tie an exercise to the library, DCU's untie it, and a name of the
 * coach's own keeps the tie the exercise had, until the coach removes it.
 */

const LIBRARY: ExerciseChoice[] = [
  { name: "Kat og ko", group: "mobility", sets: 1, reps: "10", load: "", ref: "builtin:catCow" },
  { name: "Planke", group: "core", sets: 1, reps: "30 sek", load: "", ref: "builtin:plank" },
];
const CATALOGUE: ExerciseChoice[] = [
  { name: "Planke", group: "core", sets: 3, reps: "30 s", load: "kropsvægt" },
  { name: "Ben ekstension", group: "legs", sets: 3, reps: "12", load: "RM" },
];
const CHOICES = mergeChoices(LIBRARY, CATALOGUE);

/** A new exercise as the builder starts it. */
const fresh: Exercise = { name: "", group: "legs", sets: 3, reps: "12", load: "", note: "" };

describe("the builder's choices", () => {
  it("are the library's first, then the catalogue's the library does not already name", () => {
    expect(CHOICES.map((c) => c.name)).toEqual(["Kat og ko", "Planke", "Ben ekstension"]);
    expect(CHOICES.find((c) => c.name === "Planke")?.ref).toBe("builtin:plank");
  });
});

describe("a new name for an exercise", () => {
  it("from the library ties it and fills a new exercise's dose", () => {
    expect(renamed(fresh, "Kat og ko", CHOICES)).toEqual({
      ...fresh,
      name: "Kat og ko",
      group: "mobility",
      sets: 1,
      reps: "10",
      ref: "builtin:catCow",
    });
  });

  it("from the library ties an exercise the coach has already dosed, and keeps the dose", () => {
    const dosed = { ...fresh, sets: 4, reps: "8" };
    expect(renamed(dosed, "Planke", CHOICES)).toEqual({
      ...dosed,
      name: "Planke",
      ref: "builtin:plank",
    });
  });

  it("from DCU's unties it", () => {
    const tied = { ...fresh, name: "Planke", ref: "builtin:plank" as const };
    expect(renamed(tied, "Ben ekstension", CHOICES).ref).toBeUndefined();
  });

  it("of the coach's own keeps the tie, and untying takes it away", () => {
    const tied = { ...fresh, name: "Kat og ko", ref: "builtin:catCow" as const };
    const own = renamed(tied, "Kat og ko, langsomt", CHOICES);
    expect(own).toEqual({ ...tied, name: "Kat og ko, langsomt" });
    expect(untied(own)).toEqual({ ...fresh, name: "Kat og ko, langsomt" });
    expect("ref" in untied(own)).toBe(false);
  });
});
