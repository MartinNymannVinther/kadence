import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { monthHours } from "@/modules/dcu";
import { createSeasonPlan, getSeasonPlan, saveSeasonMonths } from "@/modules/season/plans";
import { seasonVolumes, teamSeasonVolumes, volumesFor } from "@/modules/season/volumes";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The four numbers read from the database (ADR 0040): the coach's season
 * plan is the goal and its basis is DCU's side, the calendar is the
 * planned side and the activities the done side — and RLS decides whose
 * numbers a caller gets at all: a rider their own, never a teammate's.
 */

const ORG = "org_volume";
const COACH = { orgId: ORG, userId: "user_volume_coach" };
const ASTRID = { orgId: ORG, userId: "user_volume_astrid" };
const WEEK = { from: "2026-11-09", to: "2026-11-15" };

let admin: Pool;

async function insert(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ORG, ...values });
  await admin.query(q.text, q.values);
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, ORG, ASTRID.userId, "member");
  // Born 2012: U17, first year, in the season from October 2026.
  await insert("riders", {
    id: "v_astrid",
    user_id: ASTRID.userId,
    name: "Astrid",
    birth_year: 2012,
  });
  await insert("riders", { id: "v_bo", name: "Bo", birth_year: 2010 });
  for (const [rider, date, sport, minutes] of [
    ["v_astrid", "2026-11-10", "bike", 90],
    ["v_astrid", "2026-11-12", "strength", 60],
    ["v_astrid", "2026-11-14", "bike", 180],
    ["v_bo", "2026-11-11", "bike", 120],
  ] as const)
    await insert("planned_sessions", {
      rider_id: rider,
      on_date: date,
      sport,
      title: "Pas",
      planned_minutes: minutes,
    });
  await insert("activities", {
    rider_id: "v_astrid",
    started_at: new Date("2026-11-10T15:00:00Z"),
    on_date: "2026-11-10",
    sport: "bike",
    moving_seconds: 100 * 60,
    source: "manual",
  });
  // The coach plans Astrid from U17's second year, and ten hours more in November.
  await createSeasonPlan(COACH, "v_astrid", 2026, "U17-2");
  const plan = (await getSeasonPlan(COACH, "v_astrid", 2026))!;
  await saveSeasonMonths(
    COACH,
    plan.id,
    plan.months.map((m) => (m.month === 11 ? { ...m, hours: m.hours + 10 } : m)),
    "",
  );
});

afterAll(async () => {
  await admin.end();
});

describe("a week in the calendar", () => {
  it("gives the coach every rider's four numbers, the plan's basis for DCU", async () => {
    const volumes = await volumesFor(COACH, ["v_astrid", "v_bo"], WEEK, "2026-11-11");
    const astrid = volumes.get("v_astrid")!;
    expect(astrid.basis).toBe("U17-2");
    expect(astrid.dcu?.target).toBeCloseTo((monthHours("U17-2", 11) / 30) * 7, 9);
    expect(astrid.goal).toBeCloseTo(((monthHours("U17-2", 11) + 10) / 30) * 7, 9);
    expect(astrid.planned).toBeCloseTo(4.5, 9);
    expect(astrid.done).toBeCloseTo(100 / 60, 9);
    // Bo has no plan: DCU from his birth year, and no goal.
    const bo = volumes.get("v_bo")!;
    expect(bo.basis).toBe("U19-1");
    expect(bo.goal).toBeNull();
    expect(bo.planned).toBe(2);
  });

  it("gives a rider their own numbers and nothing of a teammate's", async () => {
    const volumes = await volumesFor(ASTRID, ["v_astrid", "v_bo"], WEEK, "2026-11-11");
    expect([...volumes.keys()]).toEqual(["v_astrid"]);
  });
});

describe("the season", () => {
  it("reads one rider's months from October", async () => {
    const months = await seasonVolumes(COACH, "v_astrid", 2026, "2026-11-11");
    expect(months.map((m) => m.month)).toEqual([10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const november = months[1]!.volume;
    expect(november.goal).toBeCloseTo(monthHours("U17-2", 11) + 10, 9);
    expect(november.planned).toBeCloseTo(4.5, 9);
  });

  it("reads the team's month and season so far", async () => {
    const team = await teamSeasonVolumes(COACH, ["v_astrid", "v_bo"], "2026-11-11");
    const astrid = team.get("v_astrid")!;
    // The month holds the whole of November's plan; the season so far only up to today.
    expect(astrid.month.planned).toBeCloseTo(4.5, 9);
    expect(astrid.toDate.planned).toBeCloseTo(1.5, 9);
    expect(astrid.toDate.done).toBeCloseTo(100 / 60, 9);
    expect(astrid.toDate.dcu?.target).toBeCloseTo((monthHours("U17-2", 11) / 30) * 11, 9);
  });
});
