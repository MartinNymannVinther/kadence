import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { resetRateLimits } from "@/core/rate-limit";
import {
  closeLap,
  endRecording,
  record,
  rideToFit,
  startRecording,
  type Recording,
} from "@/modules/rulle";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A ride from Rulle comes in through POST /api/rulle/ride (ADR 0032): the
 * rider's own FIT file, imported like any other and landed on the session
 * it was ridden for. Who is signed in is set by the test. Only the rider
 * saves; a coach's trial, a parent, another rider's session and another
 * team's session are all refused, and a file sent again is answered with
 * the ride it already became.
 */

const auth = vi.hoisted(() => ({ session: null as { orgId: string; userId: string } | null }));
vi.mock("@/core/auth/guard", () => ({ requireOrgContext: async () => auth.session }));

const { POST } = await import("@/app/api/rulle/ride/route");

const ORG = "org_rulle";
const OTHER = "org_rulle_b";
const COACH = { orgId: ORG, userId: "user_rl_coach" };
const IDA = { orgId: ORG, userId: "user_rl_ida" };
const OLE = { orgId: ORG, userId: "user_rl_ole" };
const PARENT = { orgId: ORG, userId: "user_rl_parent" };
const BO = { orgId: OTHER, userId: "user_rl_bo" };
const DAY = "2026-11-12";
const BASE = "http://localhost:3000";

let admin: Pool;

/** Twenty-four minutes at 200–250 W, starting at 18:00 in Copenhagen on DAY. */
function ride(offsetSeconds = 0): Uint8Array {
  const start = Date.UTC(2026, 10, 12, 17, 0, offsetSeconds);
  const rec: Recording = startRecording(start);
  let distance = 0;
  for (let s = 0; s < 1440; s++) {
    distance += 9;
    record(rec, start + s * 1000, {
      power: s < 600 ? 200 : 250,
      cadence: 90,
      hr: 140,
      speed: 9,
      distance,
      altitude: 20,
    });
    if (s === 599) closeLap(rec, start + 600_000, "warmup");
  }
  endRecording(rec, start + 1_440_000, "work");
  return rideToFit(rec, { localOffsetSeconds: 3600 });
}

const post = (query: string, body: Uint8Array | string, headers: Record<string, string> = {}) =>
  POST(
    new Request(`${BASE}/api/rulle/ride${query}`, {
      method: "POST",
      headers: { "content-type": "application/vnd.ant.fit", ...headers },
      body: typeof body === "string" ? body : new Uint8Array(body),
    }),
  );

const row = async (sql: string, values: unknown[]) => (await admin.query(sql, values)).rows[0];

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [IDA, OLE, PARENT]) await seedPerson(admin, ORG, p.userId, "member");
  await seedPerson(admin, OTHER, BO.userId, "owner");
  const riders = [
    { org_id: ORG, id: "rl_ida", user_id: IDA.userId, name: "Ida", birth_year: 2009, ftp_watts: 230 },
    { org_id: ORG, id: "rl_ole", user_id: OLE.userId, name: "Ole", birth_year: 2008 },
    { org_id: OTHER, id: "rl_bo", user_id: BO.userId, name: "Bo", birth_year: 2008 },
  ];
  for (const r of riders) {
    const q = insertSql("riders", r);
    await admin.query(q.text, q.values);
  }
  const g = insertSql("guardians", {
    org_id: ORG,
    rider_id: "rl_ida",
    user_id: PARENT.userId,
    name: "Far",
    confirmed_at: new Date(),
  });
  await admin.query(g.text, g.values);
  const structure = {
    kind: "bike",
    steps: [{ kind: "step", intent: "steady", seconds: 1440, target: { kind: "zone", zone: 3 } }],
  };
  const sessions = [
    { org_id: ORG, id: "rl_ida_a", rider_id: "rl_ida", title: "Tærskel 3×10", planned_minutes: 30 },
    { org_id: ORG, id: "rl_ida_b", rider_id: "rl_ida", title: "Grundtur", planned_minutes: 90 },
    { org_id: ORG, id: "rl_ole_a", rider_id: "rl_ole", title: "Olés pas", planned_minutes: 60 },
    { org_id: OTHER, id: "rl_bo_a", rider_id: "rl_bo", title: "Bos pas", planned_minutes: 60 },
  ];
  for (const s of sessions) {
    const q = insertSql("planned_sessions", { ...s, on_date: DAY, sport: "bike", structure });
    await admin.query(q.text, q.values);
  }
});

beforeEach(() => {
  resetRateLimits();
  auth.session = null;
});

afterAll(async () => {
  await admin.end();
});

describe("who may save a ride from Rulle", () => {
  it("nobody who is not signed in, and no page on another site", async () => {
    expect((await post("", ride())).status).toBe(401);
    auth.session = IDA;
    const foreign = await post("?session=rl_ida_a", ride(), { "sec-fetch-site": "cross-site" });
    expect(foreign.status).toBe(403);
  });

  it("not a coach, whose ride on the trainer is a trial, and not a parent", async () => {
    for (const who of [COACH, PARENT]) {
      auth.session = who;
      const response = await post("?session=rl_ida_a", ride());
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "not_rider" });
    }
  });

  it("not onto another rider's session, nor onto another team's", async () => {
    auth.session = IDA;
    for (const other of ["rl_ole_a", "rl_bo_a", "no_such_session"]) {
      const response = await post(`?session=${other}`, ride());
      expect(response.status, other).toBe(404);
    }
    const count = await row("select count(*)::int as n from activities where rider_id = 'rl_ida'", []);
    expect(count.n).toBe(0);
  });
});

describe("the rider's own ride", () => {
  it("lands on the session it was ridden for, even when another is closer in time", async () => {
    auth.session = IDA;
    const response = await post("?session=rl_ida_b", ride());
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ sessionId: "rl_ida_b", sessionTitle: "Grundtur", duplicate: false });
    const session = await row("select activity_id from planned_sessions where id = $1", ["rl_ida_b"]);
    expect(session.activity_id).toBe(body.activityId);
    const activity = await row(
      "select source, title, sport, load_method, moving_seconds, on_date::text as on_date from activities where id = $1",
      [body.activityId],
    );
    expect(activity).toEqual({
      source: "fit",
      title: "Grundtur",
      sport: "bike",
      load_method: "power",
      moving_seconds: 1440,
      on_date: DAY,
    });
  });

  it("sent again, is answered with the ride it already became", async () => {
    auth.session = IDA;
    const first = await row("select activity_id from planned_sessions where id = $1", ["rl_ida_b"]);
    const again = await post("?session=rl_ida_b", ride());
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({
      activityId: first.activity_id,
      sessionId: "rl_ida_b",
      sessionTitle: "Grundtur",
      duplicate: true,
    });
  });

  it("without a session, is named for its route and found a session the usual way", async () => {
    auth.session = OLE;
    const name = encodeURIComponent("Vejle: Fjorden, Munkebjerg og Kiddesvej");
    const response = await post(`?name=${name}`, ride(30));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.sessionId).toBe("rl_ole_a");
    const activity = await row("select title from activities where id = $1", [body.activityId]);
    expect(activity.title).toBe("Vejle: Fjorden, Munkebjerg og Kiddesvej");
  });
});

describe("what is refused", () => {
  it("bytes that are no ride", async () => {
    auth.session = OLE;
    const response = await post("", "this is not a FIT file at all");
    expect(response.status).toBe(400);
  });

  it("an empty body, and one larger than any ride", async () => {
    auth.session = OLE;
    expect((await post("", "")).status).toBe(400);
    const big = await post("", "x", { "content-length": String(6 * 1024 * 1024) });
    expect(big.status).toBe(413);
  });
});
