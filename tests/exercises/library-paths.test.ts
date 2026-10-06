import { describe, expect, it } from "vitest";
import { filterExercises, NO_FILTER, type ExerciseFilter } from "@/modules/exercises/filter";
import {
  downloadHref,
  exerciseHref,
  paramOf,
  programHref,
  refFromParam,
} from "@/modules/exercises/library-paths";
import type { ExerciseView } from "@/modules/exercises/types";

/**
 * The library's paths and its search: Kadence's own and the team's own
 * each have an address that reads back as the reference it came from,
 * and an exercise is found by name, group and equipment.
 */

const team = "team:3f2c1a9e-8d7b-4c6a-9e5f-1a2b3c4d5e6f";

describe("the library's paths", () => {
  it("name Kadence's own by id and the team's own by row id, and back", () => {
    expect(programHref("builtin:mobilityDay")).toBe("/library/programs/mobilityDay");
    expect(exerciseHref(team)).toBe(`/library/exercises/${paramOf(team)}`);
    expect(refFromParam("mobilityDay")).toBe("builtin:mobilityDay");
    expect(refFromParam(paramOf(team))).toBe(team);
  });

  it("read nothing from an id that is neither", () => {
    for (const param of ["", "Mobility", "a", "../etc", "builtin:plank", "x".repeat(60)])
      expect(refFromParam(param), param).toBeNull();
  });

  it("hand the download route the programme and the language", () => {
    expect(downloadHref("builtin:afterRide", "da")).toBe(
      "/api/programs/download?program=builtin%3AafterRide&locale=da",
    );
  });
});

describe("finding an exercise", () => {
  const view = (
    name: string,
    group: ExerciseView["group"],
    equipment: ExerciseView["equipment"],
  ): Pick<ExerciseView, "name" | "how" | "group" | "equipment"> => ({
    name,
    how: "",
    group,
    equipment,
  });
  const list = [
    view("Hoftebøjerstræk", "mobility", ["mat"]),
    view("Squat", "legs", []),
    view("Goblet squat", "legs", ["kettlebell"]),
  ];
  const find = (filter: Partial<ExerciseFilter>) =>
    filterExercises(list, { ...NO_FILTER, ...filter }).map((e) => e.name);

  it("by part of its name, whatever the case", () => {
    expect(find({ query: "SQUAT" })).toEqual(["Squat", "Goblet squat"]);
    expect(find({ query: "hofteBØJ" })).toEqual(["Hoftebøjerstræk"]);
  });

  it("by group and by equipment, or by needing none", () => {
    expect(find({ group: "legs" })).toEqual(["Squat", "Goblet squat"]);
    expect(find({ equipment: "kettlebell" })).toEqual(["Goblet squat"]);
    expect(find({ equipment: "none" })).toEqual(["Squat"]);
    expect(find({})).toHaveLength(3);
  });
});
