import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { SPORT } from "@/modules/fit";
import { deleteActivity, getActivityFile, importFit } from "@/modules/devices/import";
import { rereadActivityDetails } from "@/modules/devices/reread";
import { getActivitySession } from "@/modules/training/activities";
import { listSessions } from "@/modules/training/sessions";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";
import { encodeRide, steadyHour } from "../fit/fixtures";

/**
 * A ride coming in as a FIT file: decoded, given a load from power at the
 * rider's FTP, stored with its file, matched to the session it fulfilled,
 * refused the second time, refused when broken, and never for a teammate.
 * The fixture ride starts 1 September 2026 at 07:00 UTC.
 */

const ORG = "org_import";
const COACH = { orgId: ORG, userId: "user_import_coach" };
const IDA = { orgId: ORG, userId: "user_import_ida" };
const MIKKEL = { orgId: ORG, userId: "user_import_mikkel" };
const DAY = "2026-09-01";

let admin: Pool;
const ride = encodeRide(steadyHour(), { sport: SPORT.cycling, timerSeconds: 3600 });

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [IDA, MIKKEL]) await seedPerson(admin, ORG, p.userId, "member");
  for (const [id, uid] of [
    ["i_ida", IDA.userId],
    ["i_mikkel", MIKKEL.userId],
  ]) {
    const q = insertSql("riders", {
      org_id: ORG,
      id,
      user_id: uid,
      name: id,
      birth_year: 2008,
      ftp_watts: 250,
      threshold_hr: 170,
    });
    await admin.query(q.text, q.values);
  }
  const s = insertSql("planned_sessions", {
    org_id: ORG,
    id: "i_session",
    rider_id: "i_ida",
    on_date: DAY,
    sport: "bike",
    title: "Grundtur",
    planned_minutes: 60,
  });
  await admin.query(s.text, s.values);
});

afterAll(async () => {
  await admin.end();
});

describe("importing a FIT file", () => {
  let activityId: string;

  it("lands on the planned session with a load from power", async () => {
    const result = await importFit(IDA, "i_ida", "morgen.fit", ride);
    expect(result).toMatchObject({
      sessionId: "i_session",
      sessionTitle: "Grundtur",
      crcOk: true,
    });
    activityId = result.activityId;
    const [session] = await listSessions(COACH, { from: DAY, to: DAY, riderIds: ["i_ida"] });
    expect(session!.activity).toMatchObject({ id: activityId, loadMethod: "power", source: "fit" });
    // An hour at 200 W against an FTP of 250: intensity 0.8, load ≈ 64.
    expect(session!.activity!.load).toBeGreaterThan(55);
    expect(session!.activity!.load).toBeLessThan(70);
    const row = await admin.query(
      "select weighted_power, avg_hr, moving_seconds, zone_seconds from activities where id = $1",
      [activityId],
    );
    expect(row.rows[0]).toMatchObject({ weighted_power: 200, avg_hr: 150 });
    expect(row.rows[0].moving_seconds).toBeGreaterThan(3500);
  });

  it("keeps the route, the power curve and the fastest second", async () => {
    const row = await admin.query(
      "select streams, best_powers, max_speed, hr_drift, laps, climbs from activities where id = $1",
      [activityId],
    );
    const r = row.rows[0];
    expect(r.streams.lat[0]).toBeCloseTo(55.6761, 4);
    expect(r.best_powers).toMatchObject({ "1": 200, "5": 200, "3600": 200 });
    expect(r.max_speed).toBe(10);
    expect(r.hr_drift).toBe(0);
    expect(r).toMatchObject({ laps: [], climbs: [] });
  });

  it("reads the file again for a coach, and never for a rider", async () => {
    await admin.query(
      "update activities set streams = null, best_powers = null, max_speed = null, laps = null where id = $1",
      [activityId],
    );
    await expect(rereadActivityDetails(IDA)).rejects.toMatchObject({ code: "forbidden" });
    expect(await rereadActivityDetails(COACH)).toEqual({ read: 1, failed: 0 });
    const row = await admin.query(
      "select streams, best_powers, max_speed, laps, load, load_method from activities where id = $1",
      [activityId],
    );
    expect(row.rows[0].streams.lat).toHaveLength(720);
    expect(row.rows[0].best_powers["3600"]).toBe(200);
    expect(row.rows[0]).toMatchObject({ max_speed: 10, laps: [], load_method: "power" });
  });

  it("names the session it fulfilled, for the activity's page", async () => {
    expect(await getActivitySession(COACH, activityId)).toEqual({
      id: "i_session",
      title: "Grundtur",
      onDate: DAY,
    });
    expect(await getActivitySession(MIKKEL, activityId)).toBeNull();
  });

  it("keeps the file for the rider to take out again", async () => {
    const file = await getActivityFile(IDA, activityId);
    expect(file?.fileName).toBe("morgen.fit");
    expect(Buffer.compare(Buffer.from(file!.bytes), Buffer.from(ride))).toBe(0);
    expect(await getActivityFile(MIKKEL, activityId)).toBeNull();
  });

  it("refuses the same file twice", async () => {
    await expect(importFit(IDA, "i_ida", "igen.fit", ride)).rejects.toMatchObject({
      code: "conflict",
      detail: "duplicate",
    });
  });

  it("refuses what is not a FIT file, with the decoder's reason", async () => {
    await expect(
      importFit(IDA, "i_ida", "x.fit", new TextEncoder().encode("not a fit file at all")),
    ).rejects.toMatchObject({ code: "invalid", detail: "not_fit" });
  });

  it("refuses a teammate's upload in another rider's name", async () => {
    await expect(importFit(MIKKEL, "i_ida", "x.fit", ride)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("opens the session again when the activity is deleted", async () => {
    await deleteActivity(IDA, activityId);
    const [session] = await listSessions(COACH, { from: DAY, to: DAY, riderIds: ["i_ida"] });
    expect(session!.activity).toBeNull();
  });
});
