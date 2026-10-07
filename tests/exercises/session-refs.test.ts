import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { refsInStructure } from "@/modules/exercises/program-session";
import { resolveExercises } from "@/modules/exercises/resolve";
import { scheduleProgram } from "@/modules/exercises/schedule";
import { archiveTeamExercise, createTeamExercise } from "@/modules/exercises/team-exercises";
import { createTeamProgram } from "@/modules/exercises/team-programs";
import { getSession } from "@/modules/training/sessions";
import { readStructure } from "@/modules/workouts/structure";
import { adminPool } from "../helpers/db";
import { createTranslator } from "next-intl";
import type { Translate } from "@/modules/exercises/dose";
import da from "../../messages/da.json";
import { PLANK, seedTeam, type Team } from "./team-fixtures";

/**
 * A session's exercises, shown with their figures: every reader of the
 * session — the rider, the parent, the coach — sees Kadence's own and
 * the team's own exercise it names, archived or not; a reference to
 * another team's exercise, or to nothing, resolves to nothing, and the
 * session shows the name it was planned with.
 */

let admin: Pool;
let a: Team;
let b: Team;
let ours: string;
let theirs: string;
// Danish words for `exercises`, values and all, as a page hands them over.
const t = createTranslator({
  locale: "da",
  messages: da,
  namespace: "exercises",
}) as unknown as Translate;

beforeAll(async () => {
  admin = adminPool();
  a = await seedTeam(admin, "tref_a");
  b = await seedTeam(admin, "tref_b");
  ours = (await createTeamExercise(a.coach, PLANK)).ref;
  theirs = (await createTeamExercise(b.coach, { ...PLANK, name: "Deres planke" })).ref;
});

afterAll(async () => {
  await admin.end();
});

describe("the exercises a session names", () => {
  it("resolve for the rider, the parent and the coach, in the reader's language", async () => {
    for (const who of [a.rider, a.parent, a.coach]) {
      const views = await resolveExercises(who, ["builtin:plank", ours], t);
      expect(Object.keys(views).sort()).toEqual(["builtin:plank", ours].sort());
      expect(views["builtin:plank"]!.name).toBe(t("items.plank.name"));
      expect(views[ours]).toMatchObject({ name: "Planke", how: PLANK.how, group: "core" });
      expect(views[ours]!.pose.joints.head).toEqual(PLANK.pose.joints.head);
    }
  });

  it("leave out another team's exercise and anything that names nothing", async () => {
    const views = await resolveExercises(
      a.rider,
      [
        theirs,
        "builtin:noSuchStretch",
        "team:00000000-0000-4000-8000-000000000000",
        "javascript:alert(1)",
        "",
      ],
      t,
    );
    expect(views).toEqual({});
    // Their own coach sees it.
    expect(Object.keys(await resolveExercises(b.coach, [theirs], t))).toEqual([theirs]);
  });

  it("still show an exercise archived since the session was laid in", async () => {
    const id = ours.slice("team:".length);
    await archiveTeamExercise(a.coach, id);
    expect(Object.keys(await resolveExercises(a.rider, [ours], t))).toEqual([ours]);
    await archiveTeamExercise(a.coach, id, false);
  });
});

describe("a programme laid into the calendar", () => {
  it("shows every exercise's figure to the rider whose session it is", async () => {
    const program = await createTeamProgram(a.coach, {
      name: "Hjemme",
      parts: [{ key: "any", items: [{ exercise: ours }, { exercise: "builtin:birdDog" }] }],
    });
    const { ids } = await scheduleProgram(
      a.coach,
      { program: `team:${program.id}`, riderIds: ["tref_a_rider"], onDate: "2026-11-04" },
      t,
    );
    const session = await getSession(a.rider, ids[0]!);
    const structure = readStructure(session!.structure, "strength");
    expect(structure.kind).toBe("strength");
    if (structure.kind !== "strength") return;
    const refs = refsInStructure(structure);
    expect(refs).toEqual([ours, "builtin:birdDog"]);
    const views = await resolveExercises(a.rider, refs, t);
    expect(structure.exercises.map((e) => views[e.ref!]?.name)).toEqual([
      "Planke",
      t("items.birdDog.name"),
    ]);
  });
});
