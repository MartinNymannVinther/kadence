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
  const ride = (
    id: string,
    riderId: string,
    onDate: string,
    hour: number,
    title = "",
    streams: unknown = null,
  ) => ({
    org_id: ORG,
    id,
    rider_id: riderId,
    started_at: new Date(`${onDate}T${String(hour).padStart(2, "0")}:00:00Z`),
    on_date: onDate,
    sport: "bike",
    title,
    moving_seconds: 3600,
    source: "fit",
    streams: streams === null ? null : JSON.stringify(streams),
  });
  await insert("activities", ride("tr_a1", "tr_anna", "2026-10-04", 10, "Morgentur"));
  await insert("activities", ride("tr_a2", "tr_anna", "2026-10-05", 16));
  // Two rides named by their files (docs/adr/0098): one out on the road, one on a trainer.
  const road = { t: [0, 5], lat: [null, 55.70001], lon: [null, 9.53] };
  const trainer = { t: [0, 5], power: [200, 210], lat: [null, null], lon: [null, null] };
  await insert("activities", ride("tr_a3", "tr_anna", "2026-10-03", 5, "24720018915", road));
  await insert(
    "activities",
    ride("tr_a4", "tr_anna", "2026-10-03", 15, "2026-10-03-17-00-00", trainer),
  );
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
    expect(rides.map((r) => [r.id, r.name, r.rpe])).toEqual([
      ["tr_a2", { title: "Grundtur" }, null],
      ["tr_a1", { title: "Morgentur" }, null],
    ]);
    expect(await hasAnyRide(ANNA, "tr_anna")).toBe(true);
  });

  it("are named by the part of the day, or as indoors, when the title is a file's name", async () => {
    const rides = await recentRides(ANNA, "tr_anna", { from: "2026-10-03", to: "2026-10-03" });
    expect(rides.map((r) => [r.id, r.name])).toEqual([
      ["tr_a4", { word: "indoorRide" }],
      ["tr_a3", { word: "morningRide" }],
    ]);
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
