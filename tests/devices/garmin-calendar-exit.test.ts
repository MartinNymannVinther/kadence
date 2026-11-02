import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { resetRateLimits } from "@/core/rate-limit";
import { WITHDRAW_DEADLINE_MS } from "@/modules/devices/calendar-exit";
import { disconnect } from "@/modules/devices/disconnect";
import { saveLink } from "@/modules/devices/links";
import { providerById } from "@/modules/devices/providers";
import { pushSession } from "@/modules/devices/push";
import { processEvent } from "@/modules/devices/webhooks";
import { deleteAccountIfAlone } from "@/modules/export/account";
import { eraseRider } from "@/modules/team/riders";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";
import { withProviderKeys } from "./fake-fetch";
import {
  called,
  emptyCalendar,
  fakeCalendar,
  workout,
  type GarminCalendar,
} from "./garmin-calendar-fixture";
import { ID_URL } from "./garmin-fixture";

/**
 * Before a Garmin link goes (docs/adr/0114), the workouts Kadence put on
 * the rider's calendar for today and later are taken off — while the
 * token still works, before Garmin is told to forget the rider — and
 * what Kadence remembers sending goes with the link. Workouts for days
 * that have passed stay, as the rider's history. A Garmin that does not
 * answer holds nobody up for more than a few seconds. A confirmed
 * deregistration only drops the rows: Garmin no longer takes the calls.
 */

const ORG = "org_gx2";
const COACH = { orgId: ORG, userId: "user_gx2_coach" };
const REGISTRATION = "DELETE https://apis.garmin.com/partner-gateway/rest/user/registration";
const TODAY = todayInCopenhagen();

let admin: Pool;
let restore: () => void;
let garmin: GarminCalendar;

const ctx = (who: string) => ({ orgId: ORG, userId: `user_gx2_${who}` });
const rowCount = async (riderId: string) =>
  (
    await admin.query("select count(*)::int as n from device_workouts where rider_id = $1", [
      riderId,
    ])
  ).rows[0].n as number;

/** A rider with Garmin and three sessions sent: yesterday's, today's and tomorrow's. */
async function riderWithWorkouts(who: string) {
  await seedPerson(admin, ORG, ctx(who).userId, "member");
  const q = insertSql("riders", {
    org_id: ORG,
    id: `gx2_${who}`,
    user_id: ctx(who).userId,
    name: who,
    birth_year: 2008,
  });
  await admin.query(q.text, q.values);
  await saveLink(
    ctx(who),
    "garmin",
    `gx2-${who}`,
    { accessToken: `acc-${who}`, refreshToken: null, expiresAt: new Date(Date.now() + 3600_000) },
    ["ACTIVITY_EXPORT", "WORKOUT_IMPORT"],
  );
  fakeCalendar(garmin);
  const ids: string[] = [];
  for (const [n, offset] of [
    [1, -1],
    [2, 0],
    [3, 1],
  ] as const) {
    const s = insertSql("planned_sessions", {
      org_id: ORG,
      id: `gx2_${who}_${n}`,
      rider_id: `gx2_${who}`,
      on_date: addDaysIso(TODAY, offset),
      sport: "bike",
      title: "Pas",
      structure: {
        kind: "bike",
        steps: [
          { kind: "step", intent: "steady", seconds: 600, target: { kind: "zone", zone: 2 } },
        ],
      },
    });
    await admin.query(s.text, s.values);
    ids.push((await pushSession(ctx(who), `gx2_${who}_${n}`, "garmin")).externalId);
  }
  vi.unstubAllGlobals();
  return ids;
}

beforeAll(async () => {
  restore = withProviderKeys();
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  garmin = emptyCalendar();
});

beforeEach(async () => {
  await resetRateLimits();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

afterAll(async () => {
  restore();
  await admin.end();
});

describe("disconnecting Garmin", () => {
  it("takes today's and later workouts off first, then tells Garmin, and forgets what was sent", async () => {
    const [past, today, tomorrow] = await riderWithWorkouts("eva");
    const calls = fakeCalendar(garmin, {
      [REGISTRATION]: () => new Response(null, { status: 204 }),
    });
    await disconnect(ctx("eva"), "garmin");
    const done = called(calls);
    expect(done.at(-1)).toBe("DELETE /partner-gateway/rest/user/registration");
    expect(done.slice(0, -1).sort()).toEqual(
      [
        `DELETE /training-api/workout/v2/${today}`,
        `DELETE /training-api/workout/v2/${tomorrow}`,
        "DELETE /training-api/schedule/2002",
        "DELETE /training-api/schedule/2003",
      ].sort(),
    );
    expect(garmin.workouts.has(past!)).toBe(true);
    expect(garmin.workouts.has(today!)).toBe(false);
    expect(await rowCount("gx2_eva")).toBe(0);
  });

  it("is not held up for long by a Garmin that does not answer about workouts", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const [, today] = await riderWithWorkouts("finn");
    const calls = fakeCalendar(garmin, {
      [workout("DELETE", today!)]: () => new Promise<Response>(() => undefined),
      [REGISTRATION]: () => new Response(null, { status: 204 }),
    });
    const started = Date.now();
    await disconnect(ctx("finn"), "garmin");
    expect(Date.now() - started).toBeLessThan(WITHDRAW_DEADLINE_MS + 2_000);
    expect(called(calls)).toContain("DELETE /partner-gateway/rest/user/registration");
    expect(await rowCount("gx2_finn")).toBe(0);
  });
});

describe("the other ways a rider leaves", () => {
  it("erasing a rider takes the workouts off before Garmin is told", async () => {
    const [, today, tomorrow] = await riderWithWorkouts("gro");
    const calls = fakeCalendar(garmin, {
      [REGISTRATION]: () => new Response(null, { status: 204 }),
    });
    await eraseRider(COACH, "gx2_gro");
    const done = called(calls);
    expect(done.at(-1)).toBe("DELETE /partner-gateway/rest/user/registration");
    expect(done).toContain(`DELETE /training-api/workout/v2/${today}`);
    expect(done).toContain(`DELETE /training-api/workout/v2/${tomorrow}`);
    expect(await rowCount("gx2_gro")).toBe(0);
  });

  it("deleting an account does it for a team the person left, and drops the rows", async () => {
    const [, today] = await riderWithWorkouts("hal");
    await admin.query("delete from memberships where user_id = $1", [ctx("hal").userId]);
    const calls = fakeCalendar(garmin, {
      [REGISTRATION]: () => new Response(null, { status: 204 }),
    });
    expect(await deleteAccountIfAlone(ctx("hal").userId)).toBe(true);
    expect(called(calls)).toContain(`DELETE /training-api/workout/v2/${today}`);
    expect(called(calls).at(-1)).toBe("DELETE /partner-gateway/rest/user/registration");
    expect(await rowCount("gx2_hal")).toBe(0);
  });

  it("a confirmed deregistration drops the rows and calls the Training API not at all", async () => {
    await riderWithWorkouts("ida");
    const calls = fakeCalendar(garmin, {
      [ID_URL]: () => new Response(null, { status: 401 }),
    });
    expect(
      await processEvent(providerById("garmin"), {
        kind: "deregistration",
        externalUserId: "gx2-ida",
      }),
    ).toBe("revoked");
    expect(called(calls)).toEqual(["GET /partner-gateway/rest/user/id"]);
    expect(await rowCount("gx2_ida")).toBe(0);
  });
});
