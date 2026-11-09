import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { rateLimit, resetRateLimits } from "@/core/rate-limit";
import {
  APP_CALLS_PER_MINUTE,
  RIDER_CALLS_PER_DAY,
  TIDY_LEAVES_APP,
  TIDY_LEAVES_RIDER,
} from "@/modules/devices/calendar-budget";
import { syncGarminCalendars } from "@/modules/devices/workouts-job";
import { adminPool } from "../helpers/db";
import { withProviderKeys } from "./fake-fetch";
import {
  called,
  emptyCalendar,
  fakeCalendar,
  type GarminCalendar,
} from "./garmin-calendar-fixture";
import { day, tidyTeam } from "./garmin-tidy-fixture";

/**
 * What Kadence's tidy on Garmin (docs/adr/0115) leaves to sending: the
 * upcoming sessions are sent first in a run, and tidying never takes the
 * share of the minute's budget or the rider's day that sending keeps. A
 * session moved from a day just passed into the window takes its workout
 * along rather than leaving it behind for the tidy.
 */

const NEW = "gs_ane_new";

let admin: Pool;
let restore: () => void;
let garmin: GarminCalendar;
let team: ReturnType<typeof tidyTeam>;

const spend = async (key: string, n: number, windowMs: number) => {
  for (let i = 0; i < n; i++) await rateLimit(key, 999, windowMs);
};

beforeAll(async () => {
  restore = withProviderKeys();
  admin = adminPool();
  team = tidyTeam(admin, "gs");
  await team.seed();
});

beforeEach(async () => {
  await resetRateLimits();
  await team.clear();
  garmin = emptyCalendar();
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await admin.query("delete from planned_sessions where id = $1", [NEW]);
});

afterAll(async () => {
  await team.clear();
  restore();
  await admin.end();
});

describe("a session moved from a day just passed into the window", () => {
  it("takes its workout along: replaced and moved, not left behind and sent again", async () => {
    await team.session(NEW, "ane", 1);
    await team.sent(garmin, "ane", 1075, -2, { session: NEW });
    const calls = fakeCalendar(garmin);
    expect(await syncGarminCalendars()).toMatchObject({ sent: 1 });
    expect(called(calls)).toEqual([
      "GET /training-api/workout/v2/1075",
      "PUT /training-api/workout/v2/1075",
      "PUT /training-api/schedule/2075",
    ]);
    expect(garmin.schedules.get("2075")).toEqual({ workoutId: "1075", date: day(1) });
    expect((await team.rows("ane")).map((r) => [r.id, r.day])).toEqual([["1075", day(1)]]);
  });
});

describe("the budgets", () => {
  it("send the upcoming sessions first, and tidy after", async () => {
    await team.session(NEW, "ane", 2);
    await team.sent(garmin, "ane", 1071, -4);
    const calls = fakeCalendar(garmin);
    await syncGarminCalendars();
    expect(called(calls)).toEqual([
      "POST /workoutportal/workout/v2",
      "POST /training-api/schedule/",
      "DELETE /training-api/schedule/2071",
      "DELETE /training-api/workout/v2/1071",
    ]);
  });

  it("keep the minute's share for sending: tidying waits, sending does not", async () => {
    await team.session(NEW, "ane", 2);
    await team.sent(garmin, "ane", 1072, -4);
    await spend("calendar:garmin", APP_CALLS_PER_MINUTE - TIDY_LEAVES_APP, 60_000);
    const calls = fakeCalendar(garmin);
    const run = await syncGarminCalendars();
    expect(called(calls)).toEqual([
      "POST /workoutportal/workout/v2",
      "POST /training-api/schedule/",
    ]);
    expect(run).toMatchObject({ sent: 1, tidied: 0, stopped: true });
    expect((await team.rows("ane")).map((r) => r.id)).toContain("1072");
  });

  it("keep the rider's share of the day for sending, and the other riders are tidied", async () => {
    await team.sent(garmin, "ane", 1073, -4);
    await team.sent(garmin, "bo", 1074, -4);
    await spend("calendar:garmin:gs_ane", RIDER_CALLS_PER_DAY - TIDY_LEAVES_RIDER, 86_400_000);
    const calls = fakeCalendar(garmin);
    const run = await syncGarminCalendars();
    expect(called(calls)).toEqual([
      "DELETE /training-api/schedule/2074",
      "DELETE /training-api/workout/v2/1074",
    ]);
    expect(run).toMatchObject({ tidied: 1, stopped: false });
    expect((await team.rows("ane")).map((r) => r.id)).toEqual(["1073"]);
  });
});
