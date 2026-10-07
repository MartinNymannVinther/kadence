import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { BUILTIN_EXERCISES } from "@/modules/exercises/builtin";
import { resolveProgram, teamProgramView } from "@/modules/exercises/resolve";
import { archiveTeamExercise, createTeamExercise } from "@/modules/exercises/team-exercises";
import {
  archiveTeamProgram,
  createTeamProgram,
  getTeamProgram,
  listTeamPrograms,
  updateTeamProgram,
  type TeamProgramDraft,
} from "@/modules/exercises/team-programs";
import da from "../../messages/da.json";
import en from "../../messages/en.json";
import { adminPool } from "../helpers/db";
import { danish, PLANK, seedTeam, type Team } from "./team-fixtures";

/**
 * A team's own programme through the services: a coach makes one of
 * Kadence's exercises and the team's own; a rider cannot; it names only
 * exercises that exist — Kadence's, or this team's and not archived — and
 * an exercise archived after it was put in still resolves, in the
 * programme and in its view, while it cannot be put into a new one.
 */

let admin: Pool;
let a: Team;
let b: Team;
let plankRef: string;
let foreignRef: string;
let programId: string;

/** One of Kadence's own, whichever comes first; the built-in slice owns the list. */
const BUILTIN = BUILTIN_EXERCISES[0]!;
const builtinRef = `builtin:${BUILTIN.id}`;

const program = (parts: TeamProgramDraft["parts"]): TeamProgramDraft => ({
  name: "Morgen og aften",
  description: "Hver dag i vinterpausen.",
  parts,
});

beforeAll(async () => {
  admin = adminPool();
  a = await seedTeam(admin, "tprs_a");
  b = await seedTeam(admin, "tprs_b");
  plankRef = (await createTeamExercise(a.coach, PLANK)).ref;
  foreignRef = (await createTeamExercise(b.coach, { ...PLANK, name: "Fremmed" })).ref;
});

afterAll(async () => {
  await admin.end();
});

describe("a team's own programme", () => {
  it("is made by a coach from both kinds of exercise", async () => {
    const made = await createTeamProgram(
      a.coach,
      program([
        { key: "morning", items: [{ exercise: builtinRef }] },
        {
          key: "evening",
          items: [
            { exercise: plankRef, dose: { kind: "time", seconds: 60 } },
            { exercise: builtinRef },
          ],
        },
      ]),
    );
    programId = made.id;
    const [stored] = await listTeamPrograms(a.parent);
    expect(stored).toMatchObject({ id: programId, name: "Morgen og aften", archived: false });
    expect(stored!.parts[1]!.items[0]).toEqual({
      exercise: plankRef,
      dose: { kind: "time", seconds: 60, perSide: false, sets: 1 },
    });
  });

  it("is made by no rider and no parent", async () => {
    const parts = [{ key: "any" as const, items: [{ exercise: builtinRef }] }];
    for (const who of [a.rider, a.parent]) {
      await expect(createTeamProgram(who, program(parts))).rejects.toMatchObject({
        code: "forbidden",
      });
      await expect(updateTeamProgram(who, programId, program(parts))).rejects.toMatchObject({
        code: "forbidden",
      });
      await expect(archiveTeamProgram(who, programId)).rejects.toMatchObject({
        code: "forbidden",
      });
    }
  });

  it("names nothing that does not exist, and nothing of another team's", async () => {
    for (const exercise of [
      "builtin:noSuchStretch",
      "team:00000000-0000-4000-8000-000000000000",
      foreignRef,
    ]) {
      await expect(
        createTeamProgram(a.coach, program([{ key: "any", items: [{ exercise }] }])),
      ).rejects.toMatchObject({ code: "invalid", detail: "exerciseUnknown" });
    }
  });

  it("refuses what does not fit the contract", async () => {
    const item = { exercise: builtinRef };
    for (const parts of [
      [],
      [{ key: "any", items: [] }],
      [
        { key: "any", items: [item] },
        { key: "any", items: [item] },
      ],
      [{ key: "noon", items: [item] }],
      [{ key: "any", items: [{ exercise: "hipFlexor" }] }],
      [{ key: "any", items: [{ ...item, dose: { kind: "reps", reps: 1000 } }] }],
    ]) {
      await expect(createTeamProgram(a.coach, program(parts as never))).rejects.toMatchObject({
        code: "invalid",
      });
    }
  });

  it("resolves in the reader's language, with the programme's own dose where it has one", async () => {
    const view = await teamProgramView(a.rider, programId, danish());
    expect(view).toMatchObject({
      title: "Morgen og aften",
      description: "Hver dag i vinterpausen.",
    });
    expect(view!.parts.map((p) => p.key)).toEqual(["morning", "evening"]);
    const [plank, stretch] = view!.parts[1]!.items;
    expect(plank!.exercise).toMatchObject({ ref: plankRef, name: "Planke", group: "core" });
    expect(plank!.dose).toEqual({ kind: "time", seconds: 60, perSide: false, sets: 1 });
    expect(stretch!.exercise).toMatchObject({
      ref: builtinRef,
      name: danish()(`items.${BUILTIN.id}.name`),
    });
    expect(stretch!.exercise.name).not.toContain("items.");
    expect(stretch!.dose).toEqual(stretch!.exercise.dose);
  });

  it("keeps an exercise archived after it was put in, and refuses it in a new programme", async () => {
    await archiveTeamExercise(a.coach, plankRef.slice("team:".length));
    const view = await teamProgramView(a.parent, programId, danish());
    expect(view!.parts[1]!.items[0]!.exercise.name).toBe("Planke");

    const stored = (await getTeamProgram(a.coach, programId))!;
    await updateTeamProgram(a.coach, programId, { ...program(stored.parts), name: "Omdøbt" });
    expect((await getTeamProgram(a.coach, programId))!.name).toBe("Omdøbt");

    await expect(
      createTeamProgram(a.coach, program([{ key: "any", items: [{ exercise: plankRef }] }])),
    ).rejects.toMatchObject({ code: "invalid", detail: "exerciseArchived" });
  });

  it("leaves out what another team's reader cannot see, rather than failing", async () => {
    const parts = [
      { key: "any" as const, items: [{ exercise: plankRef }] },
      { key: "after" as const, items: [{ exercise: builtinRef }] },
    ];
    const view = await resolveProgram(b.coach, parts, danish(), { title: "x", description: "" });
    expect(view.parts.map((p) => p.key)).toEqual(["after"]);
    expect(await teamProgramView(b.coach, programId, danish())).toBeNull();
    await expect(updateTeamProgram(b.coach, programId, program(parts))).rejects.toMatchObject({
      code: "notFound",
    });
  });

  it("leaves the list when archived, and is audited", async () => {
    await archiveTeamProgram(a.coach, programId);
    expect(await listTeamPrograms(a.rider)).toEqual([]);
    expect(await listTeamPrograms(a.coach, { includeArchived: true })).toHaveLength(1);
    const { rows } = await admin.query(
      `select action, actor_user_id from audit_log
       where entity_type = 'team_programs' and entity_id = $1 order by created_at, id`,
      [programId],
    );
    expect(rows.map((r) => r.action)).toEqual([
      "team_programs.insert",
      "team_programs.update",
      "team_programs.update",
    ]);
    expect(rows.every((r) => r.actor_user_id === a.coach.userId)).toBe(true);
  });

  it("has words for its refusals in both languages", () => {
    // The refusals reach the page as `detail` and are looked up in `errors`
    // at runtime (src/components/common/use-run.ts), where the static key
    // check in tests/i18n cannot follow them.
    for (const errors of [da.errors, en.errors]) {
      expect(errors.exerciseUnknown).toBeTruthy();
      expect(errors.exerciseArchived).toBeTruthy();
    }
  });
});
