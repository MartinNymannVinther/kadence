import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { hasAnyRide, recentRides } from "@/modules/today/recent-rides";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Today's question about the last ride (docs/adr/0063) reads rides under
 * the caller's RLS: a rider reads their own, newest first with the
 * session's title when the ride has none, and a teammate who asks for
 * someone else's gets nothing — whatever id the page hands over.
 */

const ORG = "org_today_rides";
const ANNA = { orgId: ORG, userId: "user_tr_anna" };
const BO = { orgId: ORG, userId: "user_tr_bo" };

let admin: Pool;

async function insert(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, values);
  await admin.query(q.text, q.values);
}

beforeAll(async () => {
  admin = adminPool();
  for (const p of [ANNA, BO]) await seedPerson(admin, ORG, p.userId, "member");
  await insert("riders", {
    org_id: ORG,
    id: "tr_anna",
    user_id: ANNA.userId,
    name: "Anna",
    birth_year: 2010,
  });
  await insert("riders", {
    org_id: ORG,
    id: "tr_bo",
    user_id: BO.userId,
    name: "Bo",
    birth_year: 2010,
  });
  const ride = (id: string, riderId: string, onDate: string, hour: number, title = "") => ({
    org_id: ORG,
    id,
    rider_id: riderId,
    started_at: new Date(`${onDate}T${hour}:00:00Z`),
    on_date: onDate,
    sport: "bike",
    title,
    moving_seconds: 3600,
    source: "fit",
  });
  await insert("activities", ride("tr_a1", "tr_anna", "2026-10-04", 10, "Morgentur"));
  await insert("activities", ride("tr_a2", "tr_anna", "2026-10-05", 16));
  await insert("planned_sessions", {
    org_id: ORG,
    id: "tr_s2",
    rider_id: "tr_anna",
    on_date: "2026-10-05",
    sport: "bike",
    title: "Grundtur",
    activity_id: "tr_a2",
  });
});

afterAll(async () => {
  await admin.end();
});

describe("the last rides on Today", () => {
  it("are the rider's own, newest first, named after the session when the ride is not", async () => {
    const rides = await recentRides(ANNA, "tr_anna", { from: "2026-10-04", to: "2026-10-06" });
    expect(rides.map((r) => [r.id, r.title, r.rpe])).toEqual([
      ["tr_a2", "Grundtur", null],
      ["tr_a1", "Morgentur", null],
    ]);
    expect(await hasAnyRide(ANNA, "tr_anna")).toBe(true);
  });

  it("keep to the days asked for", async () => {
    const rides = await recentRides(ANNA, "tr_anna", { from: "2026-10-05", to: "2026-10-06" });
    expect(rides.map((r) => r.id)).toEqual(["tr_a2"]);
  });

  it("are nobody else's, whatever id is asked for", async () => {
    expect(await recentRides(BO, "tr_anna", { from: "2026-10-01", to: "2026-10-06" })).toEqual([]);
    expect(await hasAnyRide(BO, "tr_anna")).toBe(false);
    expect(await hasAnyRide(BO, "tr_bo")).toBe(false);
  });
});
