import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { resetRateLimits } from "@/core/rate-limit";
import { syncGarminCalendars } from "@/modules/devices/workouts-job";
import { adminPool } from "../helpers/db";
import { json, withProviderKeys } from "./fake-fetch";
import {
  called,
  emptyCalendar,
  fakeCalendar,
  schedule,
  type GarminCalendar,
} from "./garmin-calendar-fixture";
import { tidyTeam } from "./garmin-tidy-fixture";

/**
 * Kadence tidies its own workouts off the rider's Garmin (docs/adr/0115).
 * A workout stays for the three days after its day, untouched; on the
 * fourth, the job takes it off, schedule first, and drops its row. One
 * the rider deleted already is gone; Garmin's 429 or a passing failure
 * keeps the row for a later run; a link that does not let Kadence hold
 * workouts, or a 401 or 403, means Kadence can no longer, and the rows go
 * without another call and without touching the link. It is done whatever
 * the rider's switch says. What it leaves to sending is
 * garmin-calendar-tidy-send.test.ts.
 */

let admin: Pool;
let restore: () => void;
let garmin: GarminCalendar;
let team: ReturnType<typeof tidyTeam>;

beforeAll(async () => {
  restore = withProviderKeys();
  admin = adminPool();
  team = tidyTeam(admin, "gt");
  await team.seed();
});

beforeEach(async () => {
  await resetRateLimits();
  await team.clear();
  garmin = emptyCalendar();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await team.clear();
  restore();
  await admin.end();
});

describe("a workout whose day has passed", () => {
  it("stays untouched, with no call, for the three days after its day", async () => {
    await team.sent(garmin, "ane", 1061, -1);
    await team.sent(garmin, "ane", 1062, -2);
    await team.sent(garmin, "ane", 1063, -3);
    const before = await team.rows("ane");
    const calls = fakeCalendar(garmin);
    const run = await syncGarminCalendars();
    expect(calls).toHaveLength(0);
    expect(run).toMatchObject({ tidied: 0, dropped: 0 });
    expect(await team.rows("ane")).toEqual(before);
  });

  it("is taken off Garmin on the fourth day, schedule first, and its row dropped", async () => {
    await team.sent(garmin, "ane", 1061, -3);
    await team.sent(garmin, "ane", 1064, -4);
    const calls = fakeCalendar(garmin);
    const run = await syncGarminCalendars();
    expect(called(calls)).toEqual([
      "DELETE /training-api/schedule/2064",
      "DELETE /training-api/workout/v2/1064",
    ]);
    expect(calls.every((c) => c.headers.get("authorization") === "Bearer acc-ane")).toBe(true);
    expect(run).toMatchObject({ tidied: 1, dropped: 0 });
    expect(garmin.workouts.has("1064")).toBe(false);
    expect(garmin.schedules.has("2064")).toBe(false);
    expect(garmin.workouts.has("1061")).toBe(true);
    expect((await team.rows("ane")).map((r) => r.id)).toEqual(["1061"]);
  });

  it("is dropped when the rider deleted it in Garmin Connect already", async () => {
    await team.sent(garmin, "ane", 1065, -5, { gone: true });
    const calls = fakeCalendar(garmin);
    await syncGarminCalendars();
    expect(called(calls)).toEqual([
      "DELETE /training-api/schedule/2065",
      "DELETE /training-api/workout/v2/1065",
    ]);
    expect(await team.rows("ane")).toEqual([]);
  });

  it("waits for a later run when Garmin is busy, or fails to answer", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await team.sent(garmin, "ane", 1066, -6);
    let calls = fakeCalendar(garmin, { [schedule("DELETE", 2066)]: () => json({}, 429) });
    expect(await syncGarminCalendars()).toMatchObject({ stopped: true, tidied: 0 });
    expect(called(calls)).toEqual(["DELETE /training-api/schedule/2066"]);
    expect((await team.rows("ane")).map((r) => r.id)).toEqual(["1066"]);

    vi.unstubAllGlobals();
    const down = () => new Response(null, { status: 503 });
    fakeCalendar(garmin, { [schedule("DELETE", 2066)]: down });
    expect(await syncGarminCalendars()).toMatchObject({ stopped: false, failed: 1 });
    expect((await team.rows("ane"))[0]).toMatchObject({ id: "1066", last_error: "provider_error" });

    vi.unstubAllGlobals();
    calls = fakeCalendar(garmin);
    expect(await syncGarminCalendars()).toMatchObject({ tidied: 1 });
    expect(called(calls)).toHaveLength(2);
    expect(await team.rows("ane")).toEqual([]);
  });

  it("is dropped without a call when the rider has not let Garmin take workouts", async () => {
    await team.sent(garmin, "cy", 1067, -4);
    const calls = fakeCalendar(garmin);
    const run = await syncGarminCalendars();
    expect(calls).toHaveLength(0);
    expect(run).toMatchObject({ tidied: 0, dropped: 1 });
    expect(await team.rows("cy")).toEqual([]);
    expect(garmin.workouts.has("1067")).toBe(true);
  });

  it.each([401, 403])(
    "is dropped, with the rider's others, without another call when Garmin answers %i, and the link is left as it is",
    async (status) => {
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      await team.sent(garmin, "dy", 1068, -4);
      await team.sent(garmin, "dy", 1069, -5);
      const refuse = () => new Response(null, { status });
      const calls = fakeCalendar(garmin, {
        [schedule("DELETE", 2068)]: refuse,
        [schedule("DELETE", 2069)]: refuse,
      });
      const run = await syncGarminCalendars();
      expect(calls).toHaveLength(1);
      expect(run).toMatchObject({ tidied: 0, dropped: 2 });
      expect(await team.rows("dy")).toEqual([]);
      const { rows: link } = await admin.query(
        "select status, last_error from device_links where rider_id = 'gt_dy'",
      );
      expect(link[0]).toEqual({ status: "connected", last_error: "" });
    },
  );
});

describe("the rider's switch", () => {
  it("does not stop the tidy, and nothing new is sent", async () => {
    await team.sent(garmin, "bo", 1070, -4);
    const calls = fakeCalendar(garmin);
    const run = await syncGarminCalendars();
    expect(called(calls)).toEqual([
      "DELETE /training-api/schedule/2070",
      "DELETE /training-api/workout/v2/1070",
    ]);
    expect(run).toMatchObject({ sent: 0, tidied: 1 });
    expect(await team.rows("bo")).toEqual([]);
  });
});
