import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { exerciseChoices } from "@/modules/exercises/choices";
import { archiveTeamExercise, createTeamExercise } from "@/modules/exercises/team-exercises";
import { adminPool } from "../helpers/db";
import { danish, PLANK, seedTeam, type Team } from "./team-fixtures";

/**
 * What the strength builder suggests from the library: Kadence's own in
 * the reader's language and the team's own, each with its reference and
 * the dose a session starts it at; an archived exercise and another
 * team's are not among them, and every member gets the same list.
 */

let admin: Pool;
let a: Team;
let b: Team;
let ownId: string;
let archivedId: string;

beforeAll(async () => {
  admin = adminPool();
  a = await seedTeam(admin, "choice_a");
  b = await seedTeam(admin, "choice_b");
  ownId = (await createTeamExercise(a.coach, { ...PLANK, name: "Holdets planke" })).id;
  archivedId = (await createTeamExercise(a.coach, { ...PLANK, name: "Gammel planke" })).id;
  await archiveTeamExercise(a.coach, archivedId);
  await createTeamExercise(b.coach, { ...PLANK, name: "Det andet holds planke" });
});

afterAll(async () => {
  await admin.end();
});

describe("the library's exercises as the builder's choices", () => {
  it("names Kadence's own in the reader's language, with their reference and a session's dose", async () => {
    const choices = await exerciseChoices(a.coach, danish(), "da");
    expect(choices).toContainEqual({
      name: "Kat og ko",
      group: "mobility",
      sets: expect.any(Number),
      reps: expect.any(String),
      load: expect.any(String),
      ref: "builtin:catCow",
    });
    expect(choices.every((c) => c.ref && c.name && c.reps)).toBe(true);
  });

  it("holds the team's own, not an archived one and not another team's", async () => {
    const names = (await exerciseChoices(a.coach, danish(), "da")).map((c) => c.name);
    expect(names).toContain("Holdets planke");
    expect(names).not.toContain("Gammel planke");
    expect(names).not.toContain("Det andet holds planke");
    const own = (await exerciseChoices(a.coach, danish(), "da")).find(
      (c) => c.name === "Holdets planke",
    );
    expect(own?.ref).toBe(`team:${ownId}`);
  });

  it("is the same for the rider and the parent as for the coach", async () => {
    const coach = await exerciseChoices(a.coach, danish(), "da");
    expect(await exerciseChoices(a.rider, danish(), "da")).toEqual(coach);
    expect(await exerciseChoices(a.parent, danish(), "da")).toEqual(coach);
  });
});
