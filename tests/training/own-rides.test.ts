import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { addDaysIso } from "@/core/dates";
import { listOwnRides, RIDES_PAGE } from "@/modules/training/own-rides";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * "Dine ture" (docs/backlog.md P2-02): a rider's own rides, the newest
 * first, twenty at a time after a cursor of start and id. Always the
 * caller's own — a teammate gets their own rides and nothing else, a
 * cursor from someone else's list included — and a coach without a rider
 * row gets a refusal, not the team's rides.
 */

const ORG = "org_own_rides";
const COACH = { orgId: ORG, userId: "user_own_rides_coach" };
const ANNA = { orgId: ORG, userId: "user_own_rides_anna" };
const BO = { orgId: ORG, userId: "user_own_rides_bo" };
const CILLE = { orgId: ORG, userId: "user_own_rides_cille" };
const FIRST = "2026-09-01";
const TODAY = "2026-10-07";

let admin: Pool;

/** An hour in zone 2: a plan that says how hard. */
const ZONE_2 = {
  kind: "bike",
  steps: [{ kind: "step", intent: "steady", seconds: 3600, target: { kind: "zone", zone: 2 } }],
};

async function insert(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ORG, ...values });
  await admin.query(q.text, q.values);
}

const ride = (id: string, riderId: string, startedAt: string, values = {}) =>
  insert("activities", {
    id,
    rider_id: riderId,
    started_at: startedAt,
    on_date: startedAt.slice(0, 10),
    sport: "bike",
    moving_seconds: 3600,
    distance_m: 30000,
    source: "fit",
    ...values,
  });

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [ANNA, BO, CILLE]) await seedPerson(admin, ORG, p.userId, "member");
  await insert("riders", { id: "or_anna", user_id: ANNA.userId, name: "Anna", birth_year: 2010 });
  await insert("riders", { id: "or_bo", user_id: BO.userId, name: "Bo", birth_year: 2010 });

  // Twenty-three of Anna's rides on days in a row, one each morning.
  for (let i = 0; i < 23; i++) {
    const day = addDaysIso(FIRST, i);
    await ride(`or_a${String(i).padStart(2, "0")}`, "or_anna", `${day}T08:00:00Z`);
  }
  // Two more one evening, within one millisecond — microseconds apart —
  // where the first page ends: nineteen rides are newer.
  await ride("or_late_x", "or_anna", "2026-09-05T17:00:00.123456Z");
  await ride("or_late_y", "or_anna", "2026-09-05T17:00:00.123789Z");
  // The evening ride of 1 October was planned as an hour and ridden as one.
  await ride("or_planned", "or_anna", "2026-10-01T18:00:00Z", { title: "" });
  await insert("planned_sessions", {
    rider_id: "or_anna",
    on_date: "2026-10-01",
    sport: "bike",
    title: "Intervaller",
    planned_minutes: 60,
    activity_id: "or_planned",
  });
  await ride("or_bo1", "or_bo", "2026-10-02T09:00:00Z");

  // Cille's hour planned at load 60 three times: felt as 36 and as 20, and measured as 36 by power.
  await insert("riders", {
    id: "or_cille",
    user_id: CILLE.userId,
    name: "Cille",
    birth_year: 2010,
  });
  const cilles = [
    ["or_c_near", "2026-10-02", 36, "rpe"],
    ["or_c_far", "2026-10-03", 20, "rpe"],
    ["or_c_power", "2026-10-04", 36, "power"],
  ] as const;
  for (const [id, day, load, method] of cilles) {
    await ride(id, "or_cille", `${day}T09:00:00Z`, { load, load_method: method, rpe: 5 });
    await insert("planned_sessions", {
      rider_id: "or_cille",
      on_date: day,
      sport: "bike",
      title: "Rolig tur",
      planned_minutes: 60,
      planned_load: 60,
      structure: ZONE_2,
      activity_id: id,
    });
  }
  // Her easy 31-minute run on "Løbetur 30 min", which says only how long:
  // twice the planned load by the bike's threshold pulse (14 October).
  await ride("or_c_run", "or_cille", "2026-10-05T09:00:00Z", {
    sport: "other",
    moving_seconds: 31 * 60,
    load: 42,
    load_method: "hr",
  });
  await insert("planned_sessions", {
    rider_id: "or_cille",
    on_date: "2026-10-05",
    sport: "other",
    title: "Løbetur 30 min",
    planned_minutes: 30,
    planned_load: 21,
    structure: { kind: "other", text: "", minutes: 30 },
    activity_id: "or_c_run",
  });
});

afterAll(async () => {
  await admin.end();
});

describe("Dine ture", () => {
  it("lists the rider's twenty newest rides, then the rest after the cursor", async () => {
    const first = await listOwnRides(ANNA, { today: TODAY });
    expect(first.rides).toHaveLength(RIDES_PAGE);
    expect(first.rides[0]!.id).toBe("or_planned");
    expect(first.next).not.toBeNull();
    const second = await listOwnRides(ANNA, { before: first.next!, today: TODAY });
    expect(second.next).toBeNull();
    const ids = [...first.rides, ...second.rides].map((r) => r.id);
    expect(ids).toHaveLength(26);
    expect(new Set(ids).size).toBe(26);
    expect(ids.at(-1)).toBe("or_a00");
    const dates = [...first.rides, ...second.rides].map((r) => r.onDate);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("splits two rides a microsecond apart across the page break, skipping neither", async () => {
    const first = await listOwnRides(ANNA, { today: TODAY });
    expect(first.rides.at(-1)!.id).toBe("or_late_y");
    const second = await listOwnRides(ANNA, { before: first.next!, today: TODAY });
    expect(second.rides[0]!.id).toBe("or_late_x");
  });

  it("carries the name, the distance and how close the ride came to its session", async () => {
    const { rides } = await listOwnRides(ANNA, { today: TODAY });
    const planned = rides.find((r) => r.id === "or_planned")!;
    expect(planned).toMatchObject({
      name: { title: "Intervaller" },
      distanceM: 30000,
      colour: "green",
    });
    expect(rides.find((r) => r.id === "or_late_y")!.colour).toBe("none");
  });

  it("names a ride without a name of its own by its session, or by the evening (docs/adr/0098)", async () => {
    const { rides } = await listOwnRides(ANNA, { today: TODAY });
    expect(rides.find((r) => r.id === "or_late_y")!.name).toEqual({ word: "eveningRide" });
    const cille = await listOwnRides(CILLE, { today: TODAY });
    expect(cille.rides.find((r) => r.id === "or_c_run")!.name).toEqual({
      title: "Løbetur 30 min",
    });
  });

  it("colours an RPE ride by its minutes unless the feeling is far off (13 October)", async () => {
    const { rides } = await listOwnRides(CILLE, { today: TODAY });
    const colour = Object.fromEntries(rides.map((r) => [r.id, r.colour]));
    expect(colour).toMatchObject({ or_c_near: "green", or_c_far: "red", or_c_power: "yellow" });
  });

  it("colours a run on a plan that says only how long by its minutes (14 October)", async () => {
    const { rides } = await listOwnRides(CILLE, { today: TODAY });
    expect(rides.find((r) => r.id === "or_c_run")!.colour).toBe("green");
  });

  it("gives a teammate their own rides and none of Anna's, even with Anna's cursor", async () => {
    const own = await listOwnRides(BO, { today: TODAY });
    expect(own.rides.map((r) => r.id)).toEqual(["or_bo1"]);
    expect(own.next).toBeNull();
    const first = await listOwnRides(ANNA, { today: TODAY });
    const borrowed = await listOwnRides(BO, { before: first.next!, today: TODAY });
    expect(borrowed.rides).toEqual([]);
  });

  it("refuses a coach who rides for nobody", async () => {
    await expect(listOwnRides(COACH, { today: TODAY })).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});
