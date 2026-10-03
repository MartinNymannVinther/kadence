import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { addDaysIso } from "@/core/dates";
import { DCU_BIKE_SESSIONS } from "@/modules/dcu/bike-sessions";
import { resolveFlag } from "@/modules/insight/resolutions";
import { getInsights } from "@/modules/insight/service";
import { intensityWeeks } from "@/modules/season/intensity";
import { saveTeamSettings } from "@/modules/team/settings";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * "Intensitet uge for uge" and the middle-zone flag through the services
 * (ADR 0053): the weeks read under the same RLS as the calendar, the
 * flag only when the team has chosen the profile, and a coach's
 * "afklaret" on it, which the database now accepts.
 */

const ORG = "org_lowint";
const COACH = { orgId: ORG, userId: "user_lowint_coach" };
const LEA = { orgId: ORG, userId: "user_lowint_lea" };
const BO = { orgId: ORG, userId: "user_lowint_bo" };
const MOR = { orgId: ORG, userId: "user_lowint_mor" };
const TODAY = "2026-12-10"; // a Thursday in DCU's distance phase
const FIRST = "2026-11-16"; // the Monday three weeks before this one

const dcu = (key: string) => DCU_BIKE_SESSIONS.find((s) => s.key === key)!.structure;
const settings = {
  teamKind: "mixed",
  aiOnRiderData: false,
  allowYouthWeight: false,
  guidance: "dcu-2025",
  clubChampionship: false,
} as const;

let admin: Pool;

async function seed(table: string, row: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ORG, ...row });
  await admin.query(q.text, q.values);
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [LEA, BO, MOR]) await seedPerson(admin, ORG, p.userId, "member");
  await seed("riders", { id: "li_lea", user_id: LEA.userId, name: "Lea", birth_year: 2009 });
  await seed("riders", { id: "li_bo", user_id: BO.userId, name: "Bo", birth_year: 2009 });
  await seed("guardians", {
    rider_id: "li_lea",
    user_id: MOR.userId,
    name: "Mor",
    confirmed_at: new Date(),
  });
  // Four weeks of Lea's: two threshold sessions and three easy ones each.
  for (let w = 0; w < 4; w++)
    for (let d = 0; d < 5; d++)
      await seed("planned_sessions", {
        rider_id: "li_lea",
        on_date: addDaysIso(FIRST, 7 * w + d),
        sport: "bike",
        title: d < 2 ? "AT 3 × 8" : "Grundtur",
        structure: d < 2 ? dcu("dcu-at-3x8") : dcu("dcu-base-60"),
      });
  // A team race on Saturday, and one of Bo's own on Sunday.
  await seed("calendar_events", {
    kind: "race",
    title: "Juleløbet",
    starts_on: "2026-12-12",
    ends_on: "2026-12-12",
  });
  await seed("calendar_events", {
    rider_id: "li_bo",
    kind: "race",
    title: "Bos løb",
    starts_on: "2026-12-13",
    ends_on: "2026-12-13",
  });
});

afterAll(async () => {
  await admin.end();
});

describe("Intensitet uge for uge", () => {
  it("counts the weeks around today for whoever may see the rider", async () => {
    const data = await intensityWeeks(COACH, "li_lea", TODAY);
    expect(data.weeks).toHaveLength(8);
    expect(data.weeks[4]).toMatchObject({
      monday: "2026-12-07",
      count: { low: 3, mid: 2, high: 1, races: 1 },
    });
    expect(data.recent).toMatchObject({ low: 12, mid: 8, high: 1, races: 1 });
    expect(data.lowIntensityFirst).toBe(false);
    expect((await intensityWeeks(MOR, "li_lea", TODAY)).recent).toEqual(data.recent);
    expect((await intensityWeeks(LEA, "li_lea", TODAY)).recent).toEqual(data.recent);
  });

  it("shows a teammate none of Lea's sessions, only the team's race", async () => {
    expect((await intensityWeeks(BO, "li_lea", TODAY)).recent).toEqual({
      low: 0,
      mid: 0,
      high: 1,
      races: 1,
      unknown: 0,
    });
  });
});

describe("the middle-zone flag", () => {
  const kinds = async () =>
    (await getInsights(COACH, { today: TODAY }))
      .find((i) => i.riderId === "li_lea")!
      .flags.map((f) => f.kind);

  it("stays away until a coach chooses the profile, and only a coach may", async () => {
    expect(await kinds()).not.toContain("mid_zone");
    await expect(
      saveTeamSettings(LEA, { ...settings, lowIntensityFirst: true }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await saveTeamSettings(COACH, { ...settings, lowIntensityFirst: true });
    expect((await intensityWeeks(COACH, "li_lea", TODAY)).lowIntensityFirst).toBe(true);
    const flag = (await getInsights(COACH, { today: TODAY }))
      .find((i) => i.riderId === "li_lea")!
      .flags.find((f) => f.kind === "mid_zone");
    expect(flag).toEqual({
      kind: "mid_zone",
      severity: "info",
      values: { mid: 38, sessions: 21, limit: 10 },
    });
  });

  it("can be marked afklaret for the week", async () => {
    await resolveFlag(COACH, { riderId: "li_lea", kind: "mid_zone" }, TODAY);
    expect(await kinds()).not.toContain("mid_zone");
    const lea = (await getInsights(COACH, { today: TODAY })).find((i) => i.riderId === "li_lea")!;
    expect(lea.resolved.map((r) => r.flag.kind)).toContain("mid_zone");
  });
});
