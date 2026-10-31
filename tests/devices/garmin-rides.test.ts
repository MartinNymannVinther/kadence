import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { garminRidesIn, garminRidesLately } from "@/modules/devices/garmin-rides";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Whether a page says its numbers are derived in part from Garmin: only
 * rides the reader may read count, so the note tells a teammate or
 * another team nothing about a rider they cannot see.
 */

const ORG = "org_garmin_rides";
const OTHER = "org_garmin_rides_other";
const COACH = { orgId: ORG, userId: "user_gr_coach" };
const IDA = { orgId: ORG, userId: "user_gr_ida" };
const MIKKEL = { orgId: ORG, userId: "user_gr_mikkel" };
const STRANGER = { orgId: OTHER, userId: "user_gr_stranger" };

let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [IDA, MIKKEL]) await seedPerson(admin, ORG, p.userId, "member");
  await seedPerson(admin, OTHER, STRANGER.userId, "owner");
  for (const [id, uid] of [
    ["gr_ida", IDA.userId],
    ["gr_mikkel", MIKKEL.userId],
  ]) {
    const q = insertSql("riders", { org_id: ORG, id, user_id: uid, name: id, birth_year: 2008 });
    await admin.query(q.text, q.values);
  }
  for (const [id, riderId, source, day] of [
    ["gr_a1", "gr_ida", "garmin", "2026-10-20"],
    ["gr_a2", "gr_mikkel", "fit", "2026-10-21"],
  ]) {
    const q = insertSql("activities", {
      id,
      org_id: ORG,
      rider_id: riderId,
      started_at: `${day}T08:00:00Z`,
      on_date: day,
      sport: "bike",
      moving_seconds: 3600,
      source,
      device_name: source === "garmin" ? "Edge 1030 Plus" : null,
    });
    await admin.query(q.text, q.values);
  }
});

afterAll(async () => {
  await admin.end();
});

describe("Garmin rides behind a page", () => {
  it("are seen by the coach, in the days asked about", async () => {
    expect(await garminRidesIn(COACH, { riderIds: ["gr_ida", "gr_mikkel"] })).toBe(true);
    expect(await garminRidesIn(COACH, { riderIds: ["gr_mikkel"] })).toBe(false);
    expect(
      await garminRidesIn(COACH, { riderIds: ["gr_ida"], from: "2026-10-21", to: "2026-10-31" }),
    ).toBe(false);
    expect(await garminRidesLately(COACH, ["gr_ida"], "2026-10-31")).toBe(true);
    expect(await garminRidesLately(COACH, ["gr_ida"], "2027-06-01")).toBe(false);
  });

  it("are seen by the rider who rode them", async () => {
    expect(await garminRidesIn(IDA, { riderIds: ["gr_ida"] })).toBe(true);
  });

  it("count for nothing to a teammate or another team", async () => {
    expect(await garminRidesIn(MIKKEL, { riderIds: ["gr_ida"] })).toBe(false);
    expect(await garminRidesIn(STRANGER, { riderIds: ["gr_ida"] })).toBe(false);
  });

  it("are none when no rider is asked about", async () => {
    expect(await garminRidesIn(COACH, { riderIds: [] })).toBe(false);
  });
});
