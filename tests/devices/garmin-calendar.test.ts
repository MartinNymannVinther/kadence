import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { resetRateLimits } from "@/core/rate-limit";
import { listDeviceLinks, saveLink } from "@/modules/devices/links";
import { pushSession } from "@/modules/devices/push";
import { sessionOnDevices } from "@/modules/devices/session-device";
import { readStructure, type BikeStructure } from "@/modules/workouts/structure";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";
import { json, withProviderKeys } from "./fake-fetch";
import {
  called,
  CREATE,
  emptyCalendar,
  fakeCalendar,
  SCHEDULE_NEW,
  SCHEDULES,
  type GarminCalendar,
} from "./garmin-calendar-fixture";

/**
 * "Send til Garmin" on Garmin's Training API, version 2 (docs/adr/0114):
 * one path for every send. A new session is created and scheduled; the
 * same session pressed again sends nothing; a changed one is replaced in
 * place, a moved one only rescheduled, one the rider deleted in Garmin
 * Connect created anew; one past Garmin's step limit is refused in words.
 * What Garmin answers decides the rest: 401 is the link's, 403 is noted on
 * the link without stopping rides, 412 is a permission read again, 429 is
 * busy, and a refusal is remembered so the job does not send it again.
 */

const ORG = "org_gc";
const COACH = { orgId: ORG, userId: "user_gc_coach" };
const IDA = { orgId: ORG, userId: "user_gc_ida" };
const TODAY = todayInCopenhagen();
const DAY = addDaysIso(TODAY, 2);
const PERMISSIONS_URL = "GET https://apis.garmin.com/partner-gateway/rest/user/permissions";

let admin: Pool;
let restore: () => void;
let garmin: GarminCalendar;

const steps = (n: number) =>
  Array.from({ length: n }, () => ({
    kind: "step",
    intent: "steady",
    seconds: 60,
    target: { kind: "zone", zone: 2 },
  }));
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

async function row(sessionId: string) {
  const { rows } = await admin.query(
    "select * from device_workouts where planned_session_id = $1 and provider = 'garmin'",
    [sessionId],
  );
  return rows[0] as Record<string, unknown> | undefined;
}

async function link() {
  const { rows } = await admin.query(
    "select status, last_error, permissions from device_links where rider_id = 'gc_ida' and provider = 'garmin'",
  );
  return rows[0] as Record<string, unknown>;
}

async function session(id: string, values: Record<string, unknown> = {}) {
  const q = insertSql("planned_sessions", {
    org_id: ORG,
    id,
    rider_id: "gc_ida",
    on_date: DAY,
    sport: "bike",
    title: "Tærskel",
    planned_minutes: 60,
    structure,
    ...values,
  });
  await admin.query(q.text, q.values);
}

async function connect(permissions: string[] | null = ["ACTIVITY_EXPORT", "WORKOUT_IMPORT"]) {
  await saveLink(
    IDA,
    "garmin",
    "gc-ida",
    { accessToken: "g-ida", refreshToken: null, expiresAt: new Date(Date.now() + 3600_000) },
    permissions,
  );
}

beforeAll(async () => {
  restore = withProviderKeys();
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, ORG, IDA.userId, "member");
  const q = insertSql("riders", {
    org_id: ORG,
    id: "gc_ida",
    user_id: IDA.userId,
    name: "Ida",
    birth_year: 2009,
    ftp_watts: 250,
    threshold_hr: 180,
  });
  await admin.query(q.text, q.values);
  await connect();
  garmin = emptyCalendar();
});

beforeEach(async () => {
  await resetRateLimits();
});

afterEach(() => vi.unstubAllGlobals());

afterAll(async () => {
  restore();
  await admin.end();
});

describe("a session sent to Garmin", () => {
  it("is created on the version 2 path, scheduled on its day, and remembered", async () => {
    await session("gc_one");
    const calls = fakeCalendar(garmin);
    expect(await pushSession(IDA, "gc_one", "garmin")).toEqual({
      provider: "garmin",
      externalId: "1001",
    });
    expect(called(calls)).toEqual([
      "POST /workoutportal/workout/v2",
      "POST /training-api/schedule/",
    ]);
    expect(calls[0]!.headers.get("authorization")).toBe("Bearer g-ida");
    expect(calls[0]!.headers.get("content-type")).toBe("application/json");
    const sent = JSON.parse(calls[0]!.body!);
    expect(sent).toMatchObject({ workoutName: "Tærskel", sport: "CYCLING" });
    expect(sent.segments[0].steps[0]).toMatchObject({ targetType: "POWER", targetValueLow: 140 });
    expect(JSON.parse(calls[1]!.body!)).toEqual({ workoutId: 1001, date: DAY });
    expect(await row("gc_one")).toMatchObject({
      rider_id: "gc_ida",
      external_workout_id: "1001",
      external_schedule_id: "2001",
      last_error: "",
    });
    const kept = await row("gc_one");
    expect(kept!.content_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(kept!.sent_at).toBeInstanceOf(Date);
  });

  it("is written in the rider's name when a coach presses", async () => {
    await session("gc_coach");
    fakeCalendar(garmin);
    await pushSession(COACH, "gc_coach", "garmin");
    const { rows } = await admin.query(
      `select actor_user_id from audit_log
       where entity_type = 'device_workouts' and action = 'device_workouts.insert'
         and after_data ->> 'planned_session_id' = 'gc_coach'`,
    );
    expect(rows.map((r) => r.actor_user_id)).toEqual([IDA.userId]);
  });

  it("sends nothing when pressed again with nothing changed", async () => {
    const calls = fakeCalendar(garmin);
    await pushSession(IDA, "gc_one", "garmin");
    await pushSession(COACH, "gc_one", "garmin");
    expect(calls).toHaveLength(0);
    expect(garmin.workouts.size).toBe(2);
  });

  it("is replaced in place when it changes, its owner read first", async () => {
    const before = (await row("gc_one"))!.content_hash;
    await admin.query("update planned_sessions set title = 'Tærskel lang' where id = 'gc_one'");
    const calls = fakeCalendar(garmin);
    await pushSession(IDA, "gc_one", "garmin");
    expect(called(calls)).toEqual([
      "GET /training-api/workout/v2/1001",
      "PUT /training-api/workout/v2/1001",
    ]);
    expect(JSON.parse(calls[1]!.body!)).toMatchObject({
      workoutId: 1001,
      ownerId: 77,
      workoutName: "Tærskel lang",
    });
    expect((await row("gc_one"))!.content_hash).not.toBe(before);
  });

  it("is replaced when the rider's FTP changes, since the watts do", async () => {
    await admin.query("update riders set ftp_watts = 260 where id = 'gc_ida'");
    const calls = fakeCalendar(garmin);
    await pushSession(IDA, "gc_one", "garmin");
    expect(called(calls)).toEqual([
      "GET /training-api/workout/v2/1001",
      "PUT /training-api/workout/v2/1001",
    ]);
    const steps0 = (garmin.workouts.get("1001")!.segments as { steps: object[] }[])[0]!.steps[0];
    expect(steps0).toMatchObject({ targetValueLow: 146 });
    await admin.query("update riders set ftp_watts = 250 where id = 'gc_ida'");
    await pushSession(IDA, "gc_one", "garmin");
    expect(calls).toHaveLength(4);
  });

  it("only has its schedule moved when only its day changes", async () => {
    const moved = addDaysIso(DAY, 1);
    await admin.query("update planned_sessions set on_date = $1 where id = 'gc_one'", [moved]);
    const calls = fakeCalendar(garmin);
    await pushSession(IDA, "gc_one", "garmin");
    expect(called(calls)).toEqual(["PUT /training-api/schedule/2001"]);
    expect(JSON.parse(calls[0]!.body!)).toEqual({ scheduleId: 2001, workoutId: 1001, date: moved });
    expect(await row("gc_one")).toMatchObject({ external_schedule_id: "2001" });
    expect(garmin.schedules.get("2001")!.date).toBe(moved);
  });

  it("is created anew when the rider deleted it in Garmin Connect", async () => {
    garmin.workouts.delete("1001");
    garmin.schedules.delete("2001");
    await admin.query("update planned_sessions set title = 'Ny tærskel' where id = 'gc_one'");
    const calls = fakeCalendar(garmin);
    await pushSession(IDA, "gc_one", "garmin");
    expect(called(calls)).toEqual([
      "GET /training-api/workout/v2/1001",
      "POST /workoutportal/workout/v2",
      "POST /training-api/schedule/",
    ]);
    expect(await row("gc_one")).toMatchObject({
      external_workout_id: "1003",
      external_schedule_id: "2003",
    });
  });

  it("finds its schedule by the day when Garmin does not say the id", async () => {
    await session("gc_quiet");
    const calls = fakeCalendar(garmin, {
      [SCHEDULE_NEW]: () => new Response(null, { status: 204 }),
      [SCHEDULES]: (call) => {
        expect(new URL(call.url).searchParams.get("startDate")).toBe(DAY);
        return json([
          { scheduleId: 3999, workoutId: 1, date: DAY },
          { scheduleId: 3001, workoutId: 1004, date: DAY },
        ]);
      },
    });
    await pushSession(IDA, "gc_quiet", "garmin");
    expect(called(calls)).toEqual([
      "POST /workoutportal/workout/v2",
      "POST /training-api/schedule/",
      "GET /training-api/schedule",
    ]);
    expect(await row("gc_quiet")).toMatchObject({
      external_workout_id: "1004",
      external_schedule_id: "3001",
      last_error: "",
    });
  });
});

describe("a session Garmin cannot take", () => {
  it("is refused in words past the step limit, and a workout sent before comes off", async () => {
    await session("gc_long");
    fakeCalendar(garmin);
    await pushSession(IDA, "gc_long", "garmin");
    await admin.query("update planned_sessions set structure = $1 where id = 'gc_long'", [
      JSON.stringify({
        kind: "bike",
        steps: [1, 2, 3, 4, 5].map(() => ({ kind: "repeat", times: 2, steps: steps(20) })),
      }),
    ]);
    vi.unstubAllGlobals();
    const calls = fakeCalendar(garmin);
    await expect(pushSession(IDA, "gc_long", "garmin")).rejects.toMatchObject({
      code: "invalid",
      detail: "too_many_steps",
    });
    expect(called(calls)).toEqual([
      "DELETE /training-api/schedule/2004",
      "DELETE /training-api/workout/v2/1005",
    ]);
    expect(await row("gc_long")).toMatchObject({
      external_workout_id: null,
      external_schedule_id: null,
      last_error: "too_many_steps",
    });
    await expect(pushSession(IDA, "gc_long", "garmin")).rejects.toMatchObject({
      detail: "too_many_steps",
    });
    expect(calls).toHaveLength(2);
  });

  it("is remembered when Garmin turns it down, and sent again only by a press", async () => {
    await session("gc_bad");
    const calls = fakeCalendar(garmin, { [CREATE]: () => json({ error: "bad" }, 400) });
    await expect(pushSession(IDA, "gc_bad", "garmin")).rejects.toMatchObject({
      code: "conflict",
      detail: "provider_rejected",
    });
    expect(await row("gc_bad")).toMatchObject({
      external_workout_id: null,
      last_error: "rejected",
    });
    await expect(pushSession(IDA, "gc_bad", "garmin")).rejects.toMatchObject({
      detail: "provider_rejected",
    });
    expect(calls).toHaveLength(2);
  });
});

describe("what Garmin answers", () => {
  let answered = 0;
  let current = "";
  beforeEach(async () => {
    current = `gc_answer_${++answered}`;
    await session(current);
  });
  const latest = async () => current;

  it("429 is busy, and nothing is noted", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fakeCalendar(garmin, { [CREATE]: () => json({}, 429) });
    await expect(pushSession(IDA, await latest(), "garmin")).rejects.toMatchObject({
      detail: "provider_busy",
    });
    expect(await link()).toMatchObject({ status: "connected", last_error: "" });
  });

  it("403 is noted on the link, rides go on, and a press that gets through lifts it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const id = await latest();
    fakeCalendar(garmin, { [CREATE]: () => json({}, 403) });
    await expect(pushSession(IDA, id, "garmin")).rejects.toMatchObject({
      code: "forbidden",
      detail: "workouts_refused",
    });
    expect(await link()).toMatchObject({ status: "connected", last_error: "workouts_refused" });
    vi.unstubAllGlobals();
    fakeCalendar(garmin);
    await pushSession(IDA, id, "garmin");
    expect(await link()).toMatchObject({ status: "connected", last_error: "" });
  });

  it("412 is a permission the rider did not give, read again from Garmin", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const id = await latest();
    const calls = fakeCalendar(garmin, {
      [CREATE]: () => json({}, 412),
      [PERMISSIONS_URL]: () => json({ permissions: ["ACTIVITY_EXPORT"] }),
    });
    await expect(pushSession(IDA, id, "garmin")).rejects.toMatchObject({
      code: "forbidden",
      detail: "provider_permission",
    });
    expect((await link()).permissions).toEqual(["ACTIVITY_EXPORT"]);
    await expect(pushSession(IDA, id, "garmin")).rejects.toMatchObject({
      detail: "provider_permission",
    });
    expect(called(calls)).toEqual([
      "POST /workoutportal/workout/v2",
      "GET /partner-gateway/rest/user/permissions",
    ]);
    await connect();
  });

  it("401 leaves the link for the rider to connect again", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fakeCalendar(garmin, { [CREATE]: () => json({}, 401) });
    await expect(pushSession(IDA, await latest(), "garmin")).rejects.toMatchObject({
      code: "conflict",
      detail: "reconnect",
    });
    expect(await link()).toMatchObject({ status: "error", last_error: "unauthorized" });
    await connect();
  });
});

describe("on the session", () => {
  const status = async (who: typeof IDA, sessionId: string) => {
    const { rows } = await admin.query(
      "select on_date::text as on_date, structure from planned_sessions where id = $1",
      [sessionId],
    );
    return sessionOnDevices(who, {
      sessionId,
      onDate: rows[0].on_date,
      today: TODAY,
      structure: readStructure(rows[0].structure, "bike") as BikeStructure,
      links: await listDeviceLinks(who, "gc_ida"),
    });
  };

  it("says to the rider and the coach that it is on the rider's Garmin, and since when", async () => {
    for (const who of [IDA, COACH]) {
      const [on] = await status(who, "gc_one");
      expect(on).toMatchObject({ provider: "garmin", state: "on" });
      expect(on!.state === "on" && on!.sentAt).toBeInstanceOf(Date);
    }
  });

  it("says why it is not there: too many steps, or Garmin turned it down", async () => {
    expect(await status(IDA, "gc_long")).toEqual([
      { provider: "garmin", state: "not", reason: "too_many_steps", max: 100 },
    ]);
    expect(await status(COACH, "gc_bad")).toMatchObject([{ state: "not", reason: "rejected" }]);
  });

  it("says a session in the window comes by itself, and when Garmin may not take it", async () => {
    await session("gc_soon", { on_date: addDaysIso(TODAY, 1) });
    expect(await status(IDA, "gc_soon")).toEqual([{ provider: "garmin", state: "pending" }]);
    await connect(["ACTIVITY_EXPORT"]);
    expect(await status(COACH, "gc_soon")).toMatchObject([
      { state: "not", reason: "no_permission" },
    ]);
    await connect();
  });
});
