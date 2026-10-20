import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { monthHours } from "@/modules/dcu";
import { seniorMonthHours, seniorWeeklyCorridor } from "@/modules/paradigms";
import { createSeasonPlan, getSeasonPlan, resetSeasonPlan } from "@/modules/season/plans";
import { createTeamSeasonPlans } from "@/modules/season/team-plans";
import { volumesFor } from "@/modules/season/volumes";
import { saveTeamSettings } from "@/modules/team/settings";
import { setTrainingProfile } from "@/modules/team/training-profile";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A senior's season plan and week (docs/adr/0091): the plan starts from
 * the training profile's months, Motionist by default, and stands against
 * them; "fill again" takes the other profile; the team's plans include
 * seniors on their profile (ADR 0092); the week's corridor is the profile's. The profile is the
 * coach's or the rider's own to set, never a parent's or another rider's,
 * and the riders guard lets the rider set it and still nothing else. A
 * U19 rider beside them plans from DCU's hours as before.
 */

const ORG = "org_senior_plan";
const COACH = { orgId: ORG, userId: "user_sp_coach" };
const LARS = { orgId: ORG, userId: "user_sp_lars" };
const LEA = { orgId: ORG, userId: "user_sp_lea" };
const FAR = { orgId: ORG, userId: "user_sp_far" };

let admin: Pool;
let app: Client;

async function rider(id: string, name: string, birthYear: number, userId: string | null) {
  const r = insertSql("riders", { org_id: ORG, id, user_id: userId, name, birth_year: birthYear });
  await admin.query(r.text, r.values);
}

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [LARS, LEA, FAR]) await seedPerson(admin, ORG, p.userId, "member");
  await rider("sp_lars", "Lars", 1984, LARS.userId);
  await rider("sp_lea", "Lea", 2010, LEA.userId);
  await rider("sp_kim", "Kim", 1990, null);
  const g = insertSql("guardians", {
    org_id: ORG,
    rider_id: "sp_lea",
    user_id: FAR.userId,
    name: "Far",
    confirmed_at: new Date(),
  });
  await admin.query(g.text, g.values);
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe("a senior's season plan", () => {
  it("starts from the motionist's months when no profile is chosen", async () => {
    await createSeasonPlan(LARS, "sp_lars", 2026);
    const plan = (await getSeasonPlan(LARS, "sp_lars", 2026))!;
    expect(plan.basis).toBe("senior-motionist");
    expect(plan.guided).toBe(true);
    for (const m of plan.months)
      expect(m.hours).toBe(seniorMonthHours("senior-motionist", m.month));
    expect(plan.months.reduce((sum, m) => sum + m.hours, 0)).toBe(280);
    // DCU's month notes are written for young riders.
    expect(plan.months.every((m) => m.note === "")).toBe(true);
    expect(plan.deviations.find((d) => d.month === 7)).toMatchObject({ dcu: 34, diff: 0 });
  });

  it("fills again from the supermotionist's months, deviation against them", async () => {
    const plan = (await getSeasonPlan(COACH, "sp_lars", 2026))!;
    await resetSeasonPlan(LARS, plan.id, "senior-super-motionist");
    const reset = (await getSeasonPlan(COACH, "sp_lars", 2026))!;
    expect(reset.basis).toBe("senior-super-motionist");
    expect(reset.months.reduce((sum, m) => sum + m.hours, 0)).toBe(520);
    expect(reset.deviations.every((d) => d.diff === 0)).toBe(true);
  });

  it("starts from the profile the rider chose", async () => {
    await setTrainingProfile(COACH, { riderId: "sp_kim", profile: "super-motionist" });
    await createSeasonPlan(COACH, "sp_kim", 2027);
    expect((await getSeasonPlan(COACH, "sp_kim", 2027))!.basis).toBe("senior-super-motionist");
  });

  it("is planned with the team, on the profile (ADR 0092)", async () => {
    // ADR 0091 left a senior to their own page; since ADR 0092 "Opret
    // sæsonplaner for alle" plans them on their profile, Motionist when
    // none is chosen, as their own page would. Lars (no profile) and Kim
    // (Supermotionist) get theirs; Lea, U23, gets DCU's.
    expect(await createTeamSeasonPlans(COACH, 2028)).toEqual({ created: 3, noClass: 0 });
    const lea = (await getSeasonPlan(COACH, "sp_lea", 2028))!;
    // Born 2010, racing year 2029: U23 first year.
    expect(lea.basis).toBe("U23-1");
    expect(lea.months.find((m) => m.month === 1)!.hours).toBe(monthHours("U23-1", 1));
    const lars = (await getSeasonPlan(COACH, "sp_lars", 2028))!;
    expect(lars.basis).toBe("senior-motionist");
    expect(lars.months.reduce((sum, m) => sum + m.hours, 0)).toBe(280);
    expect((await getSeasonPlan(COACH, "sp_kim", 2028))!.basis).toBe("senior-super-motionist");
  });

  it("starts empty when the team plans without a paradigm", async () => {
    await saveTeamSettings(COACH, {
      teamKind: "mixed",
      aiOnRiderData: false,
      allowYouthWeight: false,
      guidance: "none",
      clubChampionship: false,
      lowIntensityFirst: false,
    });
    try {
      await createSeasonPlan(COACH, "sp_lars", 2029);
      const plan = (await getSeasonPlan(COACH, "sp_lars", 2029))!;
      expect(plan.months.every((m) => m.hours === 0)).toBe(true);
      expect(plan.deviations).toEqual([]);
    } finally {
      await admin.query("delete from team_settings where org_id = $1", [ORG]);
    }
  });

  it("refuses a basis that is neither a class-year nor a profile, in the database", async () => {
    const code = await expectSqlError(
      admin.query("update season_plans set basis = 'senior' where rider_id = 'sp_lars'"),
    );
    expect(code).toBe("23514");
  });
});

describe("a senior's week", () => {
  it("stands against the profile's corridor", async () => {
    const week = { from: "2026-11-02", to: "2026-11-08" };
    const volumes = await volumesFor(COACH, ["sp_lars", "sp_lea"], week, "2026-11-04");
    // Lars's 2026 plan was filled again as a supermotionist above.
    const lars = volumes.get("sp_lars")!;
    expect(lars.basis).toBe("senior-super-motionist");
    expect(lars.dcu?.target).toBeCloseTo(
      seniorWeeklyCorridor("senior-super-motionist", week.from).target,
      9,
    );
    expect(volumes.get("sp_lea")!.basis).toBe("U19-1");
  });
});

describe("who sets the training profile", () => {
  it("is the rider themselves or a coach", async () => {
    await setTrainingProfile(LARS, { riderId: "sp_lars", profile: "super-motionist" });
    await setTrainingProfile(COACH, { riderId: "sp_lars", profile: null });
    const row = await admin.query("select training_profile from riders where id = 'sp_lars'");
    expect(row.rows[0].training_profile).toBeNull();
  });

  it("is never another rider or a parent", async () => {
    await expect(
      setTrainingProfile(LEA, { riderId: "sp_lars", profile: "motionist" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      setTrainingProfile(FAR, { riderId: "sp_lea", profile: "motionist" }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("is a column the riders guard leaves to the rider, and only that one", async () => {
    const own = await asApp(app, LARS, (c) =>
      c.query(
        "update riders set training_profile = 'motionist' where id = 'sp_lars' returning training_profile",
      ),
    );
    expect(own.rows).toEqual([{ training_profile: "motionist" }]);
    const override = await asApp(app, LARS, (c) =>
      expectSqlError(c.query("update riders set category_override = 'U23-1' where id = 'sp_lars'")),
    );
    expect(override).toBe("42501");
    // Another rider's row is not even seen.
    const other = await asApp(app, LEA, (c) =>
      c.query("update riders set training_profile = 'motionist' where id = 'sp_lars'"),
    );
    expect(other.rowCount).toBe(0);
  });

  it("holds only the two profiles", async () => {
    const code = await expectSqlError(
      admin.query("update riders set training_profile = 'elite' where id = 'sp_lars'"),
    );
    expect(code).toBe("23514");
  });
});
