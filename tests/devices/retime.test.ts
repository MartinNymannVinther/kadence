import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { SPORT } from "@/modules/fit";
import { importFit } from "@/modules/devices/import";
import { retimeActivities } from "@/modules/devices/retime";
import { movingTimeOff, retimePatch } from "@/modules/devices/retime-rule";
import { rpeLoad } from "@/modules/load";
import { setFeedback } from "@/modules/training/complete";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";
import { encodeRide, smartRecordedHour, steadyHour } from "../fit/fixtures";

/**
 * Rides stored before smart recording was read right (docs/adr/0096): a
 * coach's run reads every stored file again and corrects the rides whose
 * moving time was too short — the averages, zones, work and load with it —
 * and leaves everything a person wrote. A ride by RPE is recomputed from
 * its new minutes. A ride already right is not touched, a second run
 * changes nothing, and another workspace is out of reach.
 */

const ORG = "org_retime";
const OTHER = "org_retime_other";
const COACH = { orgId: ORG, userId: "user_retime_coach" };
const IDA = { orgId: ORG, userId: "user_retime_ida" };
const BO = { orgId: ORG, userId: "user_retime_bo" };
const CARL = { orgId: ORG, userId: "user_retime_carl" };
const OTHER_COACH = { orgId: OTHER, userId: "user_retime_other_coach" };
const smart = encodeRide(smartRecordedHour(), { sport: SPORT.cycling });
const steady = encodeRide(steadyHour(), { sport: SPORT.cycling, timerSeconds: 3600 });

const COLUMNS = `moving_seconds, elapsed_seconds, started_at, title, rpe, note, avg_power,
  weighted_power, avg_hr, avg_cadence, work_kj, zone_seconds, max_speed, best_powers,
  load, load_method, updated_at`;

let admin: Pool;
const ids: Record<string, string> = {};
/** Each ride as the import stored it today, which is what the correction must come back to. */
const right: Record<string, Record<string, unknown>> = {};

const rowOf = async (id: string) =>
  (await admin.query(`select ${COLUMNS} from activities where id = $1`, [id])).rows[0];

/** What an import before the fix stored: too few moving seconds, and what was computed from them. */
async function asStoredBeforeTheFix(id: string, load: number | null) {
  await admin.query(
    `update activities set moving_seconds = 2100, avg_power = 190, weighted_power = 195,
       avg_hr = 148, avg_cadence = 88, work_kj = 400, zone_seconds = '{"power":[1],"hr":[1]}',
       max_speed = 9, load = $2 where id = $1`,
    [id, load],
  );
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [IDA, BO, CARL]) await seedPerson(admin, ORG, p.userId, "member");
  await seedPerson(admin, OTHER, OTHER_COACH.userId, "owner");
  for (const [org, id, uid, ftp, hr] of [
    [ORG, "retime_ida", IDA.userId, 250, 170],
    // No thresholds: the file gives no load, the rider's RPE does.
    [ORG, "retime_bo", BO.userId, null, null],
    [ORG, "retime_carl", CARL.userId, 250, 170],
    [OTHER, "retime_other", OTHER_COACH.userId, 250, 170],
  ] as const) {
    const q = insertSql("riders", {
      org_id: org,
      id,
      user_id: uid,
      name: id,
      birth_year: 2008,
      ftp_watts: ftp,
      threshold_hr: hr,
    });
    await admin.query(q.text, q.values);
  }
  for (const [key, ctx, rider, bytes] of [
    ["ida", IDA, "retime_ida", smart],
    ["bo", BO, "retime_bo", smart],
    ["carl", CARL, "retime_carl", steady],
    ["other", OTHER_COACH, "retime_other", smart],
  ] as const) {
    ids[key] = (await importFit(ctx, rider, `${key}.fit`, bytes)).activityId;
    await admin.query(`update activities set title = $2, note = 'Blæst' where id = $1`, [
      ids[key],
      `Tur ${key}`,
    ]);
    right[key] = await rowOf(ids[key]!);
  }
  await asStoredBeforeTheFix(ids.ida!, 40);
  await asStoredBeforeTheFix(ids.other!, 40);
  await asStoredBeforeTheFix(ids.bo!, null);
  // Bo says how hard it was afterwards; the load is RPE's, from the too-short minutes.
  await setFeedback(BO, ids.bo!, { rpe: 6, feel: null, note: "Blæst" });
});

afterAll(async () => {
  await admin.end();
});

describe("the rule", () => {
  it("corrects only a difference over 30 seconds and over 1 %", () => {
    expect(movingTimeOff(3600, 3630)).toBe(false);
    expect(movingTimeOff(3600, 3631)).toBe(false); // 31 s, under 1 % of an hour
    expect(movingTimeOff(3600, 3637)).toBe(true);
    expect(movingTimeOff(1200, 1231)).toBe(true);
    expect(movingTimeOff(1200, 1229)).toBe(false);
  });

  it("keeps an RPE load by RPE, and falls back to the RPE where the file gives nothing", () => {
    const values = { movingSeconds: 3600, load: null, loadMethod: "none" } as never;
    expect(
      retimePatch({ movingSeconds: 1800, sport: "bike", rpe: 8, loadMethod: "rpe" }, values),
    ).toMatchObject({ movingSeconds: 3600, load: 100, loadMethod: "rpe" });
    expect(
      retimePatch({ movingSeconds: 1800, sport: "bike", rpe: 8, loadMethod: "power" }, values),
    ).toMatchObject({ load: 100, loadMethod: "rpe" });
    expect(
      retimePatch({ movingSeconds: 1800, sport: "bike", rpe: null, loadMethod: "power" }, values),
    ).toMatchObject({ load: null, loadMethod: "none" });
  });
});

describe("retiming a workspace's stored rides", () => {
  it("is a coach's to run, and only in their own workspace", async () => {
    await expect(retimeActivities(IDA)).rejects.toMatchObject({ code: "forbidden" });
    await expect(retimeActivities({ orgId: OTHER, userId: COACH.userId })).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("corrects the moving time and what depends on it, and nothing a person wrote", async () => {
    const before = await rowOf(ids.ida!);
    expect(before.moving_seconds).toBe(2100);
    expect(await retimeActivities(COACH)).toEqual({ read: 3, changed: 2, failed: 0 });
    const after = await rowOf(ids.ida!);
    const { updated_at: _a, ...expected } = right.ida!;
    const { updated_at: _b, ...got } = after;
    expect(got).toEqual(expected);
    expect(after.moving_seconds).toBeGreaterThan(3500);
    expect(after).toMatchObject({ title: "Tur ida", note: "Blæst", load_method: "power" });
    expect(after.load).toBeGreaterThan(55);
  });

  it("recomputes an RPE load from the new minutes and keeps the RPE", async () => {
    const after = await rowOf(ids.bo!);
    expect(after).toMatchObject({ rpe: 6, note: "Blæst", load_method: "rpe" });
    expect(after.moving_seconds).toBe(right.bo!.moving_seconds);
    expect(after.load).toBe(Math.round(rpeLoad(Math.round(after.moving_seconds / 60), 6)));
    expect(after.load).toBeGreaterThan(Math.round(rpeLoad(35, 6)));
  });

  it("leaves a ride that was right untouched", async () => {
    expect(await rowOf(ids.carl!)).toEqual(right.carl);
  });

  it("changes nothing the second time", async () => {
    const before = await Promise.all(["ida", "bo", "carl"].map((k) => rowOf(ids[k]!)));
    expect(await retimeActivities(COACH)).toEqual({ read: 3, changed: 0, failed: 0 });
    expect(await Promise.all(["ida", "bo", "carl"].map((k) => rowOf(ids[k]!)))).toEqual(before);
  });

  it("never reaches another workspace's rides", async () => {
    expect((await rowOf(ids.other!)).moving_seconds).toBe(2100);
    expect(await retimeActivities(OTHER_COACH)).toEqual({ read: 1, changed: 1, failed: 0 });
    expect((await rowOf(ids.other!)).moving_seconds).toBe(right.other!.moving_seconds);
  });
});
