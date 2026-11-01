import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client, Pool } from "pg";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { rateLimit, resetRateLimits } from "@/core/rate-limit";
import { APP_CALLS_PER_MINUTE } from "@/modules/devices/calendar-budget";
import { setAutoSend } from "@/modules/devices/auto-send";
import { saveLink } from "@/modules/devices/links";
import { pushSession } from "@/modules/devices/push";
import { enqueue } from "@/core/jobs/queue";
import { deviceWorkoutsJob, syncGarminCalendars } from "@/modules/devices/workouts-job";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { drainJobs } from "../helpers/jobs";
import { insertSql, seedPerson } from "../helpers/rows";
import { json, withProviderKeys } from "./fake-fetch";
import {
  called,
  CREATE,
  emptyCalendar,
  fakeCalendar,
  type GarminCalendar,
} from "./garmin-calendar-fixture";

/**
 * The quarter-hourly job that keeps riders' bike sessions on their Garmin
 * (docs/adr/0114). For a rider who sends by themselves and granted
 * workout import, the bike sessions with steps from today through the
 * sixth day after are sent; what changed is changed, what left is taken
 * off, and a run in which nothing changed calls Garmin not once. A rider
 * who turned it off, or did not grant the permission, is not sent
 * anything; rows for days that have passed go without a call; Garmin's
 * 429 and Kadence's own budget end the run. The switch is the rider's
 * alone.
 */

const ORG = "org_gj";
const PEOPLE = ["ane", "bo", "cy", "dy"] as const;
const ctx = (who: string) => ({ orgId: ORG, userId: `user_gj_${who}` });
const COACH = { orgId: ORG, userId: "user_gj_coach" };
const PARENT = { orgId: ORG, userId: "user_gj_parent" };
const TODAY = todayInCopenhagen();
const day = (n: number) => addDaysIso(TODAY, n);
const bike = {
  kind: "bike",
  steps: [{ kind: "step", intent: "steady", seconds: 1800, target: { kind: "zone", zone: 2 } }],
};

let admin: Pool;
let app: Client;
let restore: () => void;
let garmin: GarminCalendar;

async function session(id: string, rider: string, onDate: string, values = {}) {
  const q = insertSql("planned_sessions", {
    org_id: ORG,
    id,
    rider_id: `gj_${rider}`,
    on_date: onDate,
    sport: "bike",
    title: id,
    structure: bike,
    ...values,
  });
  await admin.query(q.text, q.values);
}

async function rows(rider: string) {
  const { rows: found } = await admin.query(
    `select planned_session_id, external_workout_id, scheduled_on::text as day
     from device_workouts where rider_id = $1 order by scheduled_on, planned_session_id`,
    [`gj_${rider}`],
  );
  return found as { planned_session_id: string | null; external_workout_id: string; day: string }[];
}

beforeAll(async () => {
  restore = withProviderKeys();
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, ORG, PARENT.userId, "member");
  for (const who of PEOPLE) {
    await seedPerson(admin, ORG, ctx(who).userId, "member");
    const q = insertSql("riders", {
      org_id: ORG,
      id: `gj_${who}`,
      user_id: ctx(who).userId,
      name: who,
      birth_year: 2009,
      ftp_watts: 240,
    });
    await admin.query(q.text, q.values);
    const permissions =
      who === "cy"
        ? ["ACTIVITY_EXPORT"]
        : who === "dy"
          ? null
          : ["ACTIVITY_EXPORT", "WORKOUT_IMPORT"];
    await saveLink(
      ctx(who),
      "garmin",
      `gj-${who}`,
      { accessToken: `acc-${who}`, refreshToken: null, expiresAt: new Date(Date.now() + 3600_000) },
      permissions,
    );
  }
  const g = insertSql("guardians", {
    org_id: ORG,
    rider_id: "gj_ane",
    user_id: PARENT.userId,
    name: "Forælder",
    confirmed_at: new Date(),
  });
  await admin.query(g.text, g.values);
  await setAutoSend(ctx("bo"), "garmin", false);
  // Links other test files left behind send nothing here: their riders'
  // sessions are theirs to assert, and the job's counts are this team's.
  await admin.query(
    "update device_links set auto_send = false where provider = 'garmin' and org_id <> $1",
    [ORG],
  );

  await session("ane_today", "ane", day(0));
  await session("ane_sixth", "ane", day(6));
  await session("ane_seventh", "ane", day(7));
  await session("ane_gym", "ane", day(2), {
    sport: "strength",
    structure: { kind: "strength", warmup: "", exercises: [], progression: [], minutes: 45 },
  });
  await session("ane_nosteps", "ane", day(3), { structure: { kind: "bike", steps: [] } });
  await session("ane_moving", "ane", day(4));
  await session("ane_gone", "ane", day(5));
  for (const who of ["bo", "cy", "dy"]) await session(`${who}_ride`, who, day(1));
  garmin = emptyCalendar();
});

beforeEach(async () => {
  await resetRateLimits();
});

afterEach(() => vi.unstubAllGlobals());

afterAll(async () => {
  restore();
  await app.end();
  await admin.end();
});

describe("the job", () => {
  it("sends the bike sessions with steps from today through the sixth day, for riders who send by themselves", async () => {
    const calls = fakeCalendar(garmin);
    const run = await syncGarminCalendars();
    expect(run).toMatchObject({ links: 1, sent: 4, removed: 0, failed: 0, stopped: false });
    expect(calls.every((c) => c.headers.get("authorization") === "Bearer acc-ane")).toBe(true);
    expect(calls.filter((c) => `${c.method} ${c.url}` === CREATE)).toHaveLength(4);
    expect((await rows("ane")).map((r) => r.planned_session_id)).toEqual([
      "ane_today",
      "ane_moving",
      "ane_gone",
      "ane_sixth",
    ]);
    for (const who of ["bo", "cy", "dy"]) expect(await rows(who)).toEqual([]);
  });

  it("calls Garmin not once when nothing changed", async () => {
    const calls = fakeCalendar(garmin);
    const run = await syncGarminCalendars();
    expect(calls).toHaveLength(0);
    expect(run).toMatchObject({ unchanged: 4, sent: 0 });
  });

  it("changes what changed, and takes off what was deleted or moved out of the window", async () => {
    await admin.query("update planned_sessions set title = 'Ny' where id = 'ane_today'");
    await admin.query("update planned_sessions set on_date = $1 where id = 'ane_moving'", [day(9)]);
    await admin.query("delete from planned_sessions where id = 'ane_gone'");
    const calls = fakeCalendar(garmin);
    const run = await syncGarminCalendars();
    expect(run).toMatchObject({ sent: 1, removed: 2, unchanged: 1 });
    expect(called(calls)).toEqual([
      "GET /training-api/workout/v2/1001",
      "PUT /training-api/workout/v2/1001",
      "DELETE /training-api/schedule/2002",
      "DELETE /training-api/workout/v2/1002",
      "DELETE /training-api/schedule/2003",
      "DELETE /training-api/workout/v2/1003",
    ]);
    expect((await rows("ane")).map((r) => r.planned_session_id)).toEqual([
      "ane_today",
      "ane_sixth",
    ]);
  });

  it("leaves a session sent ahead by a press until the window reaches it", async () => {
    await session("ane_ahead", "ane", day(10));
    fakeCalendar(garmin);
    await pushSession(ctx("ane"), "ane_ahead", "garmin");
    vi.unstubAllGlobals();
    const calls = fakeCalendar(garmin);
    await syncGarminCalendars();
    expect(calls).toHaveLength(0);
    expect((await rows("ane")).map((r) => r.planned_session_id)).toContain("ane_ahead");
  });

  it("drops rows for days that have passed without asking Garmin, for every rider", async () => {
    for (const who of ["ane", "bo"]) {
      const q = insertSql("device_workouts", {
        org_id: ORG,
        rider_id: `gj_${who}`,
        planned_session_id: null,
        provider: "garmin",
        external_workout_id: "1098",
        external_schedule_id: "2098",
        scheduled_on: day(-1),
      });
      await admin.query(q.text, q.values);
    }
    const calls = fakeCalendar(garmin);
    const run = await syncGarminCalendars();
    expect(calls).toHaveLength(0);
    expect(run.dropped).toBeGreaterThanOrEqual(2);
    expect((await rows("bo")).length).toBe(0);
    expect((await rows("ane")).every((r) => r.day >= TODAY)).toBe(true);
  });

  it("does not send again unchanged what Garmin turned down", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await session("ane_bad", "ane", day(1));
    let tries = 0;
    fakeCalendar(garmin, {
      [CREATE]: () => {
        tries++;
        return json({}, 400);
      },
    });
    await syncGarminCalendars();
    await syncGarminCalendars();
    expect(tries).toBe(1);
    await admin.query("delete from planned_sessions where id = 'ane_bad'");
    await syncGarminCalendars();
  });
});

describe("Garmin's limits", () => {
  beforeAll(async () => {
    await session("ane_limit", "ane", day(2));
  });

  it("end the run at Garmin's 429, and the rest waits for the next run", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const calls = fakeCalendar(garmin, { [CREATE]: () => json({}, 429) });
    const run = await syncGarminCalendars();
    expect(run.stopped).toBe(true);
    expect(called(calls)).toEqual(["POST /workoutportal/workout/v2"]);
  });

  it("end the run when Kadence's own budget for the minute is spent", async () => {
    for (let i = 0; i < APP_CALLS_PER_MINUTE; i++) await rateLimit("calendar:garmin", 999, 60_000);
    const calls = fakeCalendar(garmin);
    const run = await syncGarminCalendars();
    expect(run.stopped).toBe(true);
    expect(calls).toHaveLength(0);
    await resetRateLimits();
    await syncGarminCalendars();
    expect((await rows("ane")).map((r) => r.planned_session_id)).toContain("ane_limit");
  });
});

describe("the rider's switch", () => {
  it("is the rider's: turned off, nothing more is sent, and what is there stays", async () => {
    await setAutoSend(ctx("ane"), "garmin", false);
    await admin.query("update planned_sessions set title = 'Slået fra' where id = 'ane_today'");
    const calls = fakeCalendar(garmin);
    await syncGarminCalendars();
    expect(calls).toHaveLength(0);
    expect((await rows("ane")).length).toBeGreaterThan(0);
    await setAutoSend(ctx("ane"), "garmin", true);
  });

  it("is refused to a coach and a parent, and the database lets only the rider write it", async () => {
    await expect(setAutoSend(COACH, "garmin", false)).rejects.toMatchObject({
      code: "forbidden",
      detail: "not_a_rider",
    });
    await expect(setAutoSend(PARENT, "garmin", false)).rejects.toMatchObject({
      code: "forbidden",
      detail: "not_a_rider",
    });
    for (const who of [COACH, PARENT, ctx("bo")]) {
      const changed = await asApp(app, who, (c) =>
        c.query(`update device_links set auto_send = false where rider_id = 'gj_ane'`),
      );
      expect(changed.rowCount).toBe(0);
    }
    const { rows: link } = await admin.query(
      "select auto_send from device_links where rider_id = 'gj_ane'",
    );
    expect(link[0].auto_send).toBe(true);
  });

  it("needs a connection", async () => {
    await admin.query("delete from device_links where rider_id = 'gj_dy'");
    await expect(setAutoSend(ctx("dy"), "garmin", true)).rejects.toMatchObject({
      code: "notFound",
    });
    await expect(setAutoSend(ctx("dy"), "wahoo", true)).rejects.toMatchObject({
      code: "invalid",
    });
  });
});

describe("the job's schedule", () => {
  it("runs every quarter of an hour as a recurring job, and answers counts only", async () => {
    expect(deviceWorkoutsJob.every).toBe(15 * 60_000);
    fakeCalendar(garmin);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    await enqueue(deviceWorkoutsJob, {}, { dedupeKey: "recurring" });
    const [run] = await drainJobs(["device.workouts"]);
    expect(run).toMatchObject({ outcome: "done" });
    expect(Object.keys(run!.result as object).sort()).toEqual([
      "dropped",
      "failed",
      "links",
      "refused",
      "removed",
      "sent",
      "stopped",
      "unchanged",
    ]);
    vi.restoreAllMocks();
  });
});

describe("the links the job is given", () => {
  it("are refused from inside a workspace", async () => {
    const code = await expectSqlError(
      asApp(app, ctx("ane"), (c) =>
        c.query("select * from device_links_to_sync('garmin', $1::date)", [TODAY]),
      ),
    );
    expect(code).toBe("42501");
  });

  it("name three ids and whether to send, and only links that send or hold the past", async () => {
    const { rows: listed } = await appClientRows(TODAY);
    expect(listed).toEqual([
      { org_id: ORG, rider_id: "gj_ane", rider_user_id: ctx("ane").userId, send: true },
    ]);
  });
});

async function appClientRows(today: string) {
  return asApp(app, null, (c) =>
    c.query(
      "select * from device_links_to_sync('garmin', $1::date) where org_id = $2 order by rider_id",
      [today, ORG],
    ),
  );
}
