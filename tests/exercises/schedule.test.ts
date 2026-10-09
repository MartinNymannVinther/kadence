import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { programDoses, programMinutes } from "@/modules/exercises/program-session";
import { scheduleProgram, type ScheduleProgramInput } from "@/modules/exercises/schedule";
import { createTeamExercise } from "@/modules/exercises/team-exercises";
import { archiveTeamProgram, createTeamProgram } from "@/modules/exercises/team-programs";
import { builtinProgramView } from "@/modules/exercises/view";
import { strengthStructureSchema } from "@/modules/workouts/structure";
import { adminPool } from "../helpers/db";
import { insertSql } from "../helpers/rows";
import { createTranslator } from "next-intl";
import type { Translate } from "@/modules/exercises/dose";
import da from "../../messages/da.json";
import { PLANK, seedTeam, type Team } from "./team-fixtures";

/**
 * "Læg i kalenderen": a coach lays a programme — Kadence's own or the
 * team's — into the calendars of the riders they choose, as a strength
 * session whose exercises carry their references, with minutes estimated
 * from the doses, through the calendar's own scheduler. A rider lays one
 * into their own calendar and nobody else's (docs/adr/0078), a parent
 * cannot, and no team can lay another team's programme or reach another
 * team's riders.
 */

let admin: Pool;
let a: Team;
let b: Team;
const RIDER = "tsch_a_rider";
const SECOND = "tsch_a_rider2";
const B_RIDER = "tsch_b_rider";
const DAY = "2026-11-03"; // a Tuesday
// Danish words for `exercises`, values and all, as a page hands them over.
const t = createTranslator({
  locale: "da",
  messages: da,
  namespace: "exercises",
}) as unknown as Translate;

type Row = {
  id: string;
  rider_id: string;
  on_date: string;
  sport: string;
  title: string;
  description: string;
  planned_minutes: number;
  structure: unknown;
  group_key: string | null;
  series_key: string | null;
  start_time: string | null;
  meeting_place: string;
};

async function sessions(ids: string[]): Promise<Row[]> {
  const { rows } = await admin.query<Row>(
    `select id, rider_id, to_char(on_date, 'YYYY-MM-DD') as on_date, sport, title, description,
            planned_minutes, structure, group_key, series_key, start_time::text, meeting_place
       from planned_sessions where id = any($1) order by on_date, rider_id`,
    [ids],
  );
  return rows;
}

async function count(riderId: string): Promise<number> {
  const { rows } = await admin.query<{ n: number }>(
    `select count(*)::int as n from planned_sessions where rider_id = $1`,
    [riderId],
  );
  return rows[0]!.n;
}

const lay = (who: Team["coach"], input: Partial<ScheduleProgramInput> = {}) =>
  scheduleProgram(
    who,
    { program: "builtin:coreNoEquipment", riderIds: [RIDER], onDate: DAY, ...input },
    t,
  );

beforeAll(async () => {
  admin = adminPool();
  a = await seedTeam(admin, "tsch_a");
  b = await seedTeam(admin, "tsch_b");
  const q = insertSql("riders", { org_id: "org_tsch_a", id: SECOND, name: "Bo", birth_year: 2009 });
  await admin.query(q.text, q.values);
});

afterAll(async () => {
  await admin.end();
});

describe("a coach lays one of Kadence's programmes", () => {
  it("into chosen riders' calendars as one strength session each, with time and place", async () => {
    const { ids } = await lay(a.coach, {
      riderIds: [RIDER, SECOND],
      startTime: "17:30",
      meetingPlace: "Klubhuset",
    });
    expect(ids).toHaveLength(2);
    const rows = await sessions(ids);
    const view = builtinProgramView("coreNoEquipment", t)!;
    for (const row of rows) {
      expect(row).toMatchObject({
        on_date: DAY,
        sport: "strength",
        title: view.title,
        description: view.description,
        start_time: "17:30:00",
        meeting_place: "Klubhuset",
      });
      const structure = strengthStructureSchema.parse(row.structure);
      expect(structure.exercises.map((e) => e.ref)).toEqual(
        view.parts[0]!.items.map((i) => i.exercise.ref),
      );
      expect(structure.exercises[0]).toMatchObject({ name: "Dead bug", sets: 3, reps: "10" });
      expect(row.planned_minutes).toBe(programMinutes(programDoses(view)));
      expect(structure.minutes).toBe(row.planned_minutes);
    }
    // Laid in for several at once, it is a group plan: one key across the riders.
    expect(rows[0]!.group_key).toBeTruthy();
    expect(rows[1]!.group_key).toBe(rows[0]!.group_key);
  });

  it("on chosen weekdays until a last day, as one series", async () => {
    const { ids } = await lay(a.coach, {
      riderIds: [SECOND],
      repeat: { weekdays: [2, 4], until: "2026-11-19" },
    });
    const rows = await sessions(ids);
    expect(rows.map((r) => r.on_date)).toEqual([
      "2026-11-03",
      "2026-11-05",
      "2026-11-10",
      "2026-11-12",
      "2026-11-17",
      "2026-11-19",
    ]);
    expect(new Set(rows.map((r) => r.series_key)).size).toBe(1);
    expect(rows[0]!.series_key).toBeTruthy();
  });
});

describe("a coach lays the team's own programme", () => {
  it("with the team's exercise beside Kadence's, each part named in the notes", async () => {
    const exercise = await createTeamExercise(a.coach, PLANK);
    const program = await createTeamProgram(a.coach, {
      name: "Morgen og aften",
      parts: [
        { key: "morning", items: [{ exercise: exercise.ref }] },
        {
          key: "evening",
          items: [
            {
              exercise: "builtin:catCow",
              dose: { kind: "reps", reps: 8, perSide: false, sets: 2 },
            },
          ],
        },
      ],
    });
    const { ids } = await lay(a.coach, { program: `team:${program.id}` });
    const [row] = await sessions(ids);
    expect(row!.title).toBe("Morgen og aften");
    const structure = strengthStructureSchema.parse(row!.structure);
    expect(structure.exercises).toEqual([
      {
        name: "Planke",
        group: "core",
        sets: 1,
        reps: "45 sek",
        load: "",
        note: "Morgen",
        ref: exercise.ref,
      },
      {
        name: t("items.catCow.name"),
        group: "mobility",
        sets: 2,
        reps: "8",
        load: "",
        note: "Aften",
        ref: "builtin:catCow",
      },
    ]);
  });

  it("but not once it is archived", async () => {
    const program = await createTeamProgram(a.coach, {
      name: "Gammelt",
      parts: [{ key: "any", items: [{ exercise: "builtin:plank" }] }],
    });
    await archiveTeamProgram(a.coach, program.id);
    const before = await count(RIDER);
    await expect(lay(a.coach, { program: `team:${program.id}` })).rejects.toMatchObject({
      code: "notFound",
    });
    expect(await count(RIDER)).toBe(before);
  });
});

describe("a rider lays a programme", () => {
  it("into their own calendar, as one strength session of their own", async () => {
    const before = await count(RIDER);
    const { ids } = await lay(a.rider, { onDate: "2026-11-05" });
    expect(ids).toHaveLength(1);
    const [row] = await sessions(ids);
    expect(row).toMatchObject({ rider_id: RIDER, on_date: "2026-11-05", sport: "strength" });
    expect(await count(RIDER)).toBe(before + 1);
  });

  it("but not into anyone else's, nor for themselves and another at once", async () => {
    const before = await count(SECOND);
    await expect(lay(a.rider, { riderIds: [SECOND] })).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(lay(a.rider, { riderIds: [RIDER, SECOND] })).rejects.toMatchObject({
      code: "forbidden",
    });
    expect(await count(SECOND)).toBe(before);
  });
});

describe("who may not", () => {
  it("is a parent, even for their own child", async () => {
    const before = await count(RIDER);
    await expect(lay(a.parent)).rejects.toMatchObject({ code: "forbidden" });
    expect(await count(RIDER)).toBe(before);
  });

  it("is a coach laying another team's programme", async () => {
    const theirs = await createTeamProgram(b.coach, {
      name: "Holdets eget",
      parts: [{ key: "any", items: [{ exercise: "builtin:squat" }] }],
    });
    const before = await count(RIDER);
    await expect(lay(a.coach, { program: `team:${theirs.id}` })).rejects.toMatchObject({
      code: "notFound",
    });
    expect(await count(RIDER)).toBe(before);
    // Their own coach may, for their own rider.
    const { ids } = await lay(b.coach, { program: `team:${theirs.id}`, riderIds: [B_RIDER] });
    expect(ids).toHaveLength(1);
  });

  it("is a coach laying anything into another team's riders", async () => {
    const before = await count(RIDER);
    await expect(lay(b.coach, { riderIds: [RIDER] })).rejects.toMatchObject({ code: "notFound" });
    expect(await count(RIDER)).toBe(before);
  });

  it("is anyone naming a programme Kadence does not have", async () => {
    await expect(lay(a.coach, { program: "builtin:noSuchProgram" })).rejects.toMatchObject({
      code: "notFound",
    });
  });
});
