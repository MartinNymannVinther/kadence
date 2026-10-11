import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { BUILTIN_EXERCISES } from "@/modules/exercises/builtin";
import { archiveTeamExercise, createTeamExercise } from "@/modules/exercises/team-exercises";
import { createTeamProgram } from "@/modules/exercises/team-programs";
import { exportToXlsx } from "@/modules/export/format";
import { buildOrgExport, readNewestAudit } from "@/modules/export/service";
import { adminPool } from "../helpers/db";
import { jsonExport } from "../helpers/export";
import { PLANK, POSE, seedTeam, type Team } from "../exercises/team-fixtures";

/**
 * Dogma three for a team's own exercises and programmes (drizzle/0032):
 * they leave with the team, archived ones too, as rows a reader can open
 * in a spreadsheet and as JSON that keeps every pose, dose and reference;
 * one team's export holds none of another's.
 */

const EXERCISES = "Øvelser";
const PROGRAMS = "Øvelsesprogrammer";

let admin: Pool;
let a: Team;
let b: Team;
let plank: { id: string; ref: string };
let programId: string;

beforeAll(async () => {
  admin = adminPool();
  a = await seedTeam(admin, "texp_a");
  b = await seedTeam(admin, "texp_b");
  plank = await createTeamExercise(a.coach, PLANK);
  const retired = await createTeamExercise(a.coach, { ...PLANK, name: "Gammel" });
  await archiveTeamExercise(a.coach, retired.id);
  programId = (
    await createTeamProgram(a.coach, {
      name: "Aften",
      parts: [
        {
          key: "evening",
          items: [{ exercise: plank.ref }, { exercise: `builtin:${BUILTIN_EXERCISES[0]!.id}` }],
        },
      ],
    })
  ).id;
  await createTeamExercise(b.coach, { ...PLANK, name: "Fremmed" });
});

afterAll(async () => {
  await admin.end();
});

describe("the team's own exercises in its export", () => {
  it("are all there, archived too, and nothing of another team's", async () => {
    const data = await buildOrgExport(a.coach);
    const sheet = (name: string) => data.sections.find((s) => s.sheet === name)!;
    const exercises = sheet(EXERCISES);
    const names = exercises.rows.map((row) => row[exercises.columns.indexOf("name")]);
    expect(names).toEqual(["Gammel", "Planke"]);
    expect(exercises.columns).toEqual(
      expect.arrayContaining(["group", "dose", "pose", "archived"]),
    );
    const programs = sheet(PROGRAMS);
    expect(programs.rows.map((row) => row[programs.columns.indexOf("id")])).toEqual([programId]);
  });

  it("are read by the team's rider too, as the library is", async () => {
    const data = await buildOrgExport(a.rider);
    const exercises = data.sections.find((s) => s.sheet === EXERCISES)!;
    expect(exercises.rows).toHaveLength(2);
  });

  it("keep their pose and their references in the JSON, and fit the workbook", async () => {
    const data = await buildOrgExport(a.coach);
    const json = await jsonExport(a.coach, data);
    const planke = json.tables[EXERCISES]!.find((row) => row.name === "Planke") as {
      pose: typeof POSE;
      equipment: string[];
    };
    expect(planke.pose.joints.head).toEqual(POSE.joints.head);
    expect(planke.equipment).toEqual(["mat"]);
    const parts = json.tables[PROGRAMS]![0]!.parts as Array<{ items: Array<{ exercise: string }> }>;
    expect(parts[0]!.items[0]!.exercise).toBe(plank.ref);
    const audit = await readNewestAudit(a.coach, data.auditUpTo, 100);
    expect(exportToXlsx(data, audit).subarray(0, 2).toString()).toBe("PK");
  });
});
