import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { monthHours } from "@/modules/dcu";
import {
  createSeasonPlan,
  getSeasonPlan,
  resetSeasonPlan,
  riderClass,
  saveSeasonMonths,
} from "@/modules/season/plans";
import { installDcuProgrammes } from "@/modules/training/dcu-library";
import { listTemplates } from "@/modules/training/templates";
import { listCheckins, saveCheckin } from "@/modules/wellbeing/checkins";
import { addMeasurement } from "@/modules/wellbeing/measurements";
import { getTeamSettings, saveTeamSettings } from "@/modules/team/settings";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Wave 2's services with the people who use them: DCU's programmes in the
 * library, a season plan filled from DCU's hours with the deviation in
 * view, the daily check-in that only the rider (or a coach) writes and the
 * parent reads only when shared, and weight refused for a young rider
 * unless the team allows it (ADR 0013, 0014, 0015).
 */

const ORG = "org_season";
const COACH = { orgId: ORG, userId: "user_season_coach" };
const LEA = { orgId: ORG, userId: "user_season_lea" };
const FAR = { orgId: ORG, userId: "user_season_far" };

let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [LEA, FAR]) await seedPerson(admin, ORG, p.userId, "member");
  const r = insertSql("riders", {
    org_id: ORG,
    id: "s_lea",
    user_id: LEA.userId,
    name: "Lea",
    birth_year: 2010,
  });
  await admin.query(r.text, r.values);
  const g = insertSql("guardians", {
    org_id: ORG,
    rider_id: "s_lea",
    user_id: FAR.userId,
    name: "Far",
    confirmed_at: new Date(),
  });
  await admin.query(g.text, g.values);
});

afterAll(async () => {
  await admin.end();
});

describe("DCU in the library", () => {
  it("installs the three programmes once, and again only updates them", async () => {
    expect(await installDcuProgrammes(COACH, "da")).toEqual({ installed: 3, updated: 0 });
    expect(await installDcuProgrammes(COACH, "da")).toEqual({ installed: 0, updated: 3 });
    const dcu = (await listTemplates(COACH)).filter((t) => t.source === "dcu");
    expect(dcu.map((t) => t.sourceKey).sort()).toEqual([
      "dcu-strength-u17-2016",
      "dcu-strength-u19-2016",
      "dcu-strength-u23-2016",
    ]);
    await expect(installDcuProgrammes(LEA, "da")).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("planning without DCU (ADR 0049)", () => {
  const own = {
    teamKind: "mixed",
    aiOnRiderData: false,
    allowYouthWeight: false,
    clubChampionship: false,
    lowIntensityFirst: false,
  } as const;

  it("a coach turns DCU off; the plan starts empty and nothing stands beside it", async () => {
    expect((await getTeamSettings(COACH)).guidance).toBe("dcu-2025");
    await saveTeamSettings(COACH, { ...own, guidance: "none" });
    try {
      await createSeasonPlan(COACH, "s_lea", 2030);
      const plan = (await getSeasonPlan(COACH, "s_lea", 2030))!;
      expect(plan.guided).toBe(false);
      expect(plan.deviations).toEqual([]);
      expect(plan.months.every((m) => m.hours === 0 && m.note === "")).toBe(true);
    } finally {
      // Back to no settings row at all, as the rest of this file expects.
      await admin.query("delete from team_settings where org_id = $1", [ORG]);
    }
    const again = (await getSeasonPlan(COACH, "s_lea", 2030))!;
    expect(again.guided).toBe(true);
    expect(again.deviations).toHaveLength(12);
  });

  it("only a coach changes it", async () => {
    await expect(saveTeamSettings(LEA, { ...own, guidance: "none" })).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

describe("the season plan", () => {
  it("is filled from DCU's hours for the rider's class, deviation in view", async () => {
    // Born 2010, the season starting October 2026 leads into racing year
    // 2027, when Lea turns 17: U19, first year.
    expect(riderClass({ birthYear: 2010, categoryOverride: null }, 2026).basis).toBe("U19-1");
    await createSeasonPlan(COACH, "s_lea", 2026);
    const plan = (await getSeasonPlan(COACH, "s_lea", 2026))!;
    expect(plan.basis).toBe("U19-1");
    expect(plan.months[0]!.month).toBe(10);
    expect(plan.months.find((m) => m.month === 1)!.hours).toBe(monthHours("U19-1", 1));
    expect(plan.deviations.every((d) => d.diff === 0)).toBe(true);

    const months = plan.months.map((m) => (m.month === 1 ? { ...m, hours: m.hours + 10 } : m));
    await saveSeasonMonths(COACH, plan.id, months, "Mere i januar");
    const changed = (await getSeasonPlan(LEA, "s_lea", 2026))!;
    expect(changed.deviations.find((d) => d.month === 1)!.diff).toBe(10);
    expect(await getSeasonPlan(FAR, "s_lea", 2026)).not.toBeNull();
    await expect(saveSeasonMonths(FAR, plan.id, months, "")).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("fills again from another class-year, keeping the note, for the rider or coach only", async () => {
    const plan = (await getSeasonPlan(COACH, "s_lea", 2026))!;
    await expect(resetSeasonPlan(FAR, plan.id, "U17-2")).rejects.toMatchObject({
      code: "forbidden",
    });
    await resetSeasonPlan(LEA, plan.id, "U17-2");
    const reset = (await getSeasonPlan(COACH, "s_lea", 2026))!;
    expect(reset.basis).toBe("U17-2");
    expect(reset.note).toBe("Mere i januar");
    expect(reset.months.find((m) => m.month === 1)!.hours).toBe(monthHours("U17-2", 1));
    expect(reset.deviations.every((d) => d.diff === 0)).toBe(true);
  });

  it("refuses a second plan for the same season", async () => {
    await expect(createSeasonPlan(COACH, "s_lea", 2026)).rejects.toMatchObject({
      code: "conflict",
    });
  });
});

describe("the check-in", () => {
  const checkin = {
    riderId: "s_lea",
    onDate: "2026-11-02",
    sleepHours: 7.5,
    sleepQuality: 3,
    energy: 3,
    mood: 4,
    soreness: 3,
    stress: 2,
    pain: 0,
    painWhere: "",
    ill: 0,
    note: "",
  };

  it("is written by the rider, once a day, and read by the parent only when shared", async () => {
    await saveCheckin(LEA, checkin);
    await saveCheckin(LEA, { ...checkin, energy: 4 });
    const range = { from: "2026-11-01", to: "2026-11-30" };
    expect((await listCheckins(COACH, range)).map((c) => c.energy)).toEqual([4]);
    expect(await listCheckins(FAR, range)).toEqual([]);
    await admin.query(`update riders set share_wellbeing = true where id = 's_lea'`);
    expect(await listCheckins(FAR, range)).toHaveLength(1);
    await expect(saveCheckin(FAR, checkin)).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("measurements", () => {
  it("keeps height, and refuses weight for a young rider unless the team allows it", async () => {
    await addMeasurement(LEA, {
      riderId: "s_lea",
      measuredOn: "2026-11-02",
      kind: "height_cm",
      value: 171,
      note: "",
    });
    const weight = {
      riderId: "s_lea",
      measuredOn: "2026-11-02",
      kind: "weight_kg" as const,
      value: 58,
      note: "",
    };
    await expect(addMeasurement(COACH, weight)).rejects.toMatchObject({
      code: "forbidden",
      detail: "youthWeight",
    });
    const s = insertSql("team_settings", { org_id: ORG, allow_youth_weight: true });
    await admin.query(s.text, s.values);
    await addMeasurement(COACH, weight);
  });
});
