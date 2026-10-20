import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { withOrgContext } from "@/core/db/tenant";
import { gather } from "@/modules/insight/gather";
import { getInsights } from "@/modules/insight/service";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The coach's insight reads each planned session's colour with what the
 * plan says of how hard (the amendment of 14 October to docs/adr/0095):
 * two easy runs on "Løbetur 30 min", on time but twice the planned load
 * by the bike's threshold pulse, are as planned — no "many sessions far
 * off" flag — while two rides at twice an hour in zone 2 by power still
 * raise it.
 */

const ORG = "org_plan_intensity";
const COACH = { orgId: ORG, userId: "user_plan_intensity_coach" };
const TODAY = "2026-11-05"; // a Thursday
const DAYS = ["2026-11-02", "2026-11-03"];
const ZONE_2 = {
  kind: "bike",
  steps: [{ kind: "step", intent: "steady", seconds: 3600, target: { kind: "zone", zone: 2 } }],
};
const RUN = { kind: "other", text: "", minutes: 30 };

let admin: Pool;

async function seed(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ORG, ...values });
  await admin.query(q.text, q.values);
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const [rider, name] of [
    ["pi_runner", "Martin Løber"],
    ["pi_rider", "Rikke Rytter"],
  ] as const)
    await seed("riders", { id: rider, name, birth_year: 2009 });
  for (const day of DAYS) {
    await seed("activities", {
      id: `pi_run_${day}`,
      rider_id: "pi_runner",
      started_at: `${day}T16:00:00Z`,
      on_date: day,
      sport: "other",
      moving_seconds: 31 * 60,
      load: 42,
      load_method: "hr",
      source: "fit",
    });
    await seed("planned_sessions", {
      rider_id: "pi_runner",
      on_date: day,
      sport: "other",
      title: "Løbetur 30 min",
      planned_minutes: 30,
      planned_load: 21,
      structure: RUN,
      activity_id: `pi_run_${day}`,
    });
    await seed("activities", {
      id: `pi_ride_${day}`,
      rider_id: "pi_rider",
      started_at: `${day}T16:00:00Z`,
      on_date: day,
      sport: "bike",
      moving_seconds: 3600,
      load: 84,
      load_method: "power",
      source: "fit",
    });
    await seed("planned_sessions", {
      rider_id: "pi_rider",
      on_date: day,
      sport: "bike",
      title: "Zone 2",
      planned_minutes: 60,
      planned_load: 42,
      structure: ZONE_2,
      activity_id: `pi_ride_${day}`,
    });
  }
});

afterAll(async () => {
  await admin.end();
});

describe("what the plan says of how hard, in the coach's insight", () => {
  it("is read from each session's structure", async () => {
    const data = await withOrgContext(COACH, (tx) => gather(tx, { from: DAYS[0]!, to: TODAY }));
    const of = (rider: string) =>
      data.sessions.filter((s) => s.riderId === rider).map((s) => s.intensity);
    expect(of("pi_runner")).toEqual(["none", "none"]);
    expect(of("pi_rider")).toEqual(["set", "set"]);
  });

  it("calls the runs as planned, and still flags the rides twice as hard as planned", async () => {
    const insights = await getInsights(COACH, { today: TODAY });
    const kinds = (rider: string) =>
      insights.find((i) => i.riderId === rider)!.flags.map((f) => f.kind);
    expect(kinds("pi_runner")).not.toContain("compliance");
    expect(kinds("pi_rider")).toContain("compliance");
  });
});
