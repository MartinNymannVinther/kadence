import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { env } from "@/core/env";
import { saveLink } from "@/modules/devices/links";
import { pushSession } from "@/modules/devices/push";
import type { WahooPlan } from "@/modules/devices/wahoo-plan";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";
import { fakeFetch, formOf, json, withProviderKeys } from "./fake-fetch";

/**
 * A planned bike session sent to the rider's head unit: built from the
 * session's structure and the rider's own FTP and threshold, as a Wahoo
 * plan scheduled on its day or a Garmin workout scheduled on its day. The
 * rider or a coach may send it; a parent, a teammate, a session without a
 * bike structure or a rider without a connection may not.
 */

const ORG = "org_dev_push";
const COACH = { orgId: ORG, userId: "user_dp_coach" };
const IDA = { orgId: ORG, userId: "user_dp_ida" };
const MIKKEL = { orgId: ORG, userId: "user_dp_mikkel" };
const PARENT = { orgId: ORG, userId: "user_dp_parent" };
const DAY = "2026-10-06";

let admin: Pool;
let restore: () => void;

const structure = {
  kind: "bike",
  steps: [
    { kind: "step", intent: "warmup", seconds: 600, target: { kind: "zone", zone: 2 } },
    {
      kind: "repeat",
      times: 3,
      steps: [
        { kind: "step", intent: "work", seconds: 600, target: { kind: "zone", zone: 4 } },
        { kind: "step", intent: "recover", seconds: 300, target: { kind: "zone", zone: 1 } },
      ],
    },
  ],
};

beforeAll(async () => {
  restore = withProviderKeys();
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [IDA, MIKKEL, PARENT]) await seedPerson(admin, ORG, p.userId, "member");
  for (const [id, uid] of [
    ["dp_ida", IDA.userId],
    ["dp_mikkel", MIKKEL.userId],
  ]) {
    const q = insertSql("riders", {
      org_id: ORG,
      id,
      user_id: uid,
      name: id,
      birth_year: 2010,
      ftp_watts: 250,
      threshold_hr: 180,
    });
    await admin.query(q.text, q.values);
  }
  const g = insertSql("guardians", {
    org_id: ORG,
    rider_id: "dp_ida",
    user_id: PARENT.userId,
    name: "Ida's parent",
    confirmed_at: new Date(),
  });
  await admin.query(g.text, g.values);
  for (const row of [
    { id: "dp_threshold", rider_id: "dp_ida", sport: "bike", title: "Tærskel 3x10", structure },
    {
      id: "dp_strength",
      rider_id: "dp_ida",
      sport: "strength",
      title: "Styrke",
      structure: { kind: "strength", warmup: "", exercises: [], progression: [], minutes: 60 },
    },
    { id: "dp_mikkel_ride", rider_id: "dp_mikkel", sport: "bike", title: "Tur", structure },
  ]) {
    const s = insertSql("planned_sessions", {
      org_id: ORG,
      on_date: DAY,
      planned_minutes: 60,
      description: "Hold kadencen",
      ...row,
    });
    await admin.query(s.text, s.values);
  }
  const later = new Date(Date.now() + 3600_000);
  await saveLink(IDA, "wahoo", "90001", {
    accessToken: "w-ida",
    refreshToken: null,
    expiresAt: later,
  });
  await saveLink(IDA, "garmin", "g-ida", {
    accessToken: "g-ida",
    refreshToken: null,
    expiresAt: later,
  });
});

afterEach(() => vi.unstubAllGlobals());

afterAll(async () => {
  restore();
  await admin.end();
});

describe("to Wahoo", () => {
  it("creates the plan from the structure and schedules it on the session's day", async () => {
    const calls = fakeFetch({
      "POST https://api.wahooligan.com/v1/plans": () => json({ id: 5, name: "Tærskel 3x10" }),
      "POST https://api.wahooligan.com/v1/workouts": () => json({ id: 56519, plan_id: 5 }),
    });
    const result = await pushSession(COACH, "dp_threshold", "wahoo");
    expect(result).toEqual({ provider: "wahoo", externalId: "56519" });

    const [planCall, workoutCall] = calls;
    expect(planCall!.headers.get("authorization")).toBe("Bearer w-ida");
    expect(planCall!.headers.get("content-type")).toBe("application/x-www-form-urlencoded");
    const planForm = formOf(planCall!);
    expect(planForm["plan[filename]"]).toBe("plan.json");
    expect(planForm["plan[external_id]"]).toMatch(/^kadence-dp_threshold-\d+$/);
    expect(planForm["plan[file]"]).toMatch(/^data:application\/json;base64,/);
    const plan = JSON.parse(
      Buffer.from(planForm["plan[file]"]!.split(",")[1]!, "base64").toString("utf8"),
    ) as WahooPlan;
    expect(plan.header).toMatchObject({
      name: "Tærskel 3x10",
      version: "1.0.0",
      description: "Hold kadencen",
      duration_s: 600 + 3 * 900,
      workout_type_family: 0,
      ftp: 250,
    });
    expect(plan.intervals).toEqual([
      {
        name: "Z2",
        exit_trigger_type: "time",
        exit_trigger_value: 600,
        intensity_type: "wu",
        targets: [{ type: "ftp", low: 0.56, high: 0.75 }],
      },
      {
        name: "3x",
        exit_trigger_type: "repeat",
        exit_trigger_value: 2,
        intervals: [
          {
            name: "Z4",
            exit_trigger_type: "time",
            exit_trigger_value: 600,
            intensity_type: "active",
            targets: [{ type: "ftp", low: 0.91, high: 1.05 }],
          },
          {
            name: "Z1",
            exit_trigger_type: "time",
            exit_trigger_value: 300,
            intensity_type: "recover",
            targets: [{ type: "ftp", low: 0, high: 0.55 }],
          },
        ],
      },
    ]);

    expect(formOf(workoutCall!)).toEqual({
      "workout[name]": "Tærskel 3x10",
      "workout[workout_token]": "dp_threshold",
      "workout[workout_type_id]": "0",
      "workout[starts]": "2026-10-06T12:00:00.000Z",
      "workout[minutes]": "55",
      "workout[plan_id]": "5",
      "workout[day_code]": "2470",
    });
  });

  it("asks the rider to connect again when Wahoo refuses the token", async () => {
    fakeFetch({ "POST https://api.wahooligan.com/v1/plans": () => json({}, 401) });
    await expect(pushSession(IDA, "dp_threshold", "wahoo")).rejects.toMatchObject({
      code: "conflict",
      detail: "reconnect",
    });
    const { rows } = await admin.query(
      "select status, last_error from device_links where rider_id = 'dp_ida' and provider = 'wahoo'",
    );
    expect(rows[0]).toEqual({ status: "error", last_error: "unauthorized" });
  });
});

describe("to Garmin", () => {
  it("creates the workout in watts at the rider's FTP and schedules it on the day", async () => {
    const calls = fakeFetch({
      "POST https://apis.garmin.com/training-api/workout": () => json({ workoutId: 1234 }),
      "POST https://apis.garmin.com/training-api/schedule": () => json(99),
    });
    const result = await pushSession(IDA, "dp_threshold", "garmin");
    expect(result).toEqual({ provider: "garmin", externalId: "1234" });
    const workout = JSON.parse(calls[0]!.body!);
    expect(workout).toMatchObject({
      workoutName: "Tærskel 3x10",
      description: "Hold kadencen",
      sport: "CYCLING",
      workoutProvider: "Kadence",
    });
    expect(workout.steps[0]).toMatchObject({
      type: "WorkoutStep",
      stepOrder: 1,
      intensity: "WARMUP",
      durationType: "TIME",
      durationValue: 600,
      targetType: "POWER",
      targetValueLow: 140,
      targetValueHigh: 188,
    });
    expect(workout.steps[1]).toMatchObject({
      type: "WorkoutRepeatStep",
      repeatValue: 3,
      steps: [
        { stepOrder: 3, intensity: "INTERVAL", targetValueLow: 228, targetValueHigh: 263 },
        { stepOrder: 4, intensity: "RECOVERY", targetValueLow: 0, targetValueHigh: 138 },
      ],
    });
    expect(JSON.parse(calls[1]!.body!)).toEqual({ workoutId: 1234, date: DAY });
    expect(calls[1]!.headers.get("authorization")).toBe("Bearer g-ida");
  });
});

describe("refused", () => {
  it("for a session that is not on the bike", async () => {
    await expect(pushSession(IDA, "dp_strength", "garmin")).rejects.toMatchObject({
      code: "invalid",
      detail: "not_bike",
    });
  });

  it("for a rider without a connection", async () => {
    await expect(pushSession(COACH, "dp_mikkel_ride", "garmin")).rejects.toMatchObject({
      code: "notFound",
      detail: "not_connected",
    });
  });

  it("for a teammate and for a parent", async () => {
    const calls = fakeFetch({});
    await expect(pushSession(MIKKEL, "dp_threshold", "garmin")).rejects.toMatchObject({
      code: "notFound",
    });
    await expect(pushSession(PARENT, "dp_threshold", "garmin")).rejects.toMatchObject({
      code: "forbidden",
    });
    expect(calls).toHaveLength(0);
  });

  it("when the installation has no keys for the provider", async () => {
    const saved = { ...env };
    Object.assign(env, { GARMIN_CLIENT_ID: undefined, GARMIN_CLIENT_SECRET: undefined });
    try {
      await expect(pushSession(IDA, "dp_threshold", "garmin")).rejects.toMatchObject({
        code: "invalid",
        detail: "not_configured",
      });
    } finally {
      Object.assign(env, saved);
    }
  });
});
