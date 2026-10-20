import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { monthHours } from "@/modules/dcu";
import { createSeasonPlan, getSeasonPlan } from "@/modules/season/plans";
import { createTeamSeasonPlans, teamPlanGaps } from "@/modules/season/team-plans";
import { saveTeamSettings } from "@/modules/team/settings";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Season plans for the whole team at once, through the service and the
 * database: a coach fills in a plan for every rider without one, each
 * from DCU for the rider's own class and year, and an adult from their
 * training profile (ADR 0092); a plan that exists is left as it is, a
 * rider younger than U17 is left for their own page, a rider cannot press
 * it, and another team's riders are never touched.
 */

const ORG = "org_teamplans";
const OTHER = "org_teamplans_other";
const COACH = { orgId: ORG, userId: "user_teamplans_coach" };
const RIDER = { orgId: ORG, userId: "user_teamplans_rider" };
const OTHER_COACH = { orgId: OTHER, userId: "user_teamplans_other" };
const SEASON = 2026; // the racing year 2027

let admin: Pool;

async function rider(orgId: string, id: string, birthYear: number, userId: string | null = null) {
  const q = insertSql("riders", {
    org_id: orgId,
    id,
    user_id: userId,
    name: id,
    birth_year: birthYear,
  });
  await admin.query(q.text, q.values);
}

const plansOf = async (orgId: string) =>
  (
    await admin.query(
      `select rider_id, basis from season_plans
       where org_id = $1 and season_start_year = $2 order by rider_id`,
      [orgId, SEASON],
    )
  ).rows;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, ORG, RIDER.userId, "member");
  await seedPerson(admin, OTHER, OTHER_COACH.userId, "owner");
  await rider(ORG, "tsp_ida", 2010, RIDER.userId); // U19, first year
  await rider(ORG, "tsp_bo", 2011); // U17, second year
  await rider(ORG, "tsp_has", 2009); // U19, second year, with a plan of its own
  await rider(ORG, "tsp_senior", 1990); // a senior: planned on the Motionist profile (ADR 0092)
  await rider(ORG, "tsp_young", 2015); // younger than U17: in no class
  await rider(OTHER, "tsp_other", 2010);
});

afterAll(async () => {
  await admin.end();
});

describe("season plans for the whole team", () => {
  it("is a coach's: a rider cannot press it, nor read the gaps", async () => {
    await expect(createTeamSeasonPlans(RIDER, SEASON)).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(teamPlanGaps(RIDER, SEASON)).rejects.toMatchObject({ code: "forbidden" });
    expect(await plansOf(ORG)).toEqual([]);
  });

  it("makes a plan for each rider without one, from DCU for their own class", async () => {
    // tp_has gets a plan from another class-year first; it must stay as it is.
    await createSeasonPlan(COACH, "tsp_has", SEASON, "U17-2");
    // Until ADR 0092 the senior was left out (missing 2, noClass 2); now
    // they are planned on their profile, and only the child in no class is left.
    expect(await teamPlanGaps(COACH, SEASON)).toEqual({ missing: 3, noClass: 1, seniors: 1 });

    expect(await createTeamSeasonPlans(COACH, SEASON)).toEqual({ created: 3, noClass: 1 });
    expect(await plansOf(ORG)).toEqual([
      { rider_id: "tsp_bo", basis: "U17-2" },
      { rider_id: "tsp_has", basis: "U17-2" },
      { rider_id: "tsp_ida", basis: "U19-1" },
      { rider_id: "tsp_senior", basis: "senior-motionist" },
    ]);
    const ida = await getSeasonPlan(COACH, "tsp_ida", SEASON);
    expect(ida?.guided).toBe(true);
    expect(ida?.months.find((m) => m.month === 11)?.hours).toBe(monthHours("U19-1", 11));
  });

  it("does nothing the second time, and leaves another team alone", async () => {
    expect(await teamPlanGaps(COACH, SEASON)).toEqual({ missing: 0, noClass: 1, seniors: 0 });
    expect(await createTeamSeasonPlans(COACH, SEASON)).toEqual({ created: 0, noClass: 1 });
    expect(await plansOf(OTHER)).toEqual([]);
    expect(await teamPlanGaps(OTHER_COACH, SEASON)).toEqual({ missing: 1, noClass: 0, seniors: 0 });
  });

  it("starts the months empty when the team plans without DCU", async () => {
    await saveTeamSettings(COACH, {
      teamKind: "mixed",
      aiOnRiderData: false,
      allowYouthWeight: false,
      clubChampionship: false,
      lowIntensityFirst: false,
      guidance: "none",
    });
    expect(await createTeamSeasonPlans(COACH, SEASON + 1)).toEqual({ created: 4, noClass: 1 });
    const bo = await getSeasonPlan(COACH, "tsp_bo", SEASON + 1);
    expect(bo?.guided).toBe(false);
    expect(bo?.months.every((m) => m.hours === 0)).toBe(true);
  });
});
