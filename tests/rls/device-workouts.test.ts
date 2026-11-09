import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { adminPool, appClient, asApp, asAppCommit, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * What Kadence sent to a rider's Garmin (`device_workouts`, drizzle/0062,
 * docs/adr/0114), inside one team, as the application role with raw SQL:
 * read by whoever may read the rider's training — the rider, a coach, a
 * parent the rider shares training with — written by the rider or a
 * coach, never by a teammate, a parent or another member, and a row may
 * name only one of the rider's own sessions. A session's deletion leaves
 * the row behind without it, so the workout can still be taken off.
 */

const ORG = "org_dw";
const COACH = { orgId: ORG, userId: "user_dw_coach" };
const R1 = { orgId: ORG, userId: "user_dw_r1" };
const R2 = { orgId: ORG, userId: "user_dw_r2" };
const PARENT = { orgId: ORG, userId: "user_dw_parent" };
const OTHER = { orgId: ORG, userId: "user_dw_other" };
const DAY = "2026-11-03";

let admin: Pool;
let app: Client;

async function seed(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ORG, ...values });
  await admin.query(q.text, q.values);
}

const count = (ctx: typeof COACH, where = "true") =>
  asApp(app, ctx, (c) =>
    c.query(`select count(*)::int as n from device_workouts where ${where}`),
  ).then((r) => r.rows[0].n as number);

const row = (riderId: string, sessionId: string | null) =>
  insertSql("device_workouts", {
    org_id: ORG,
    rider_id: riderId,
    planned_session_id: sessionId,
    provider: "garmin",
    scheduled_on: DAY,
  });

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner", "Garmin-pas");
  for (const p of [R1, R2, PARENT, OTHER]) await seedPerson(admin, ORG, p.userId, "member");
  await seed("riders", { id: "dw_r1", user_id: R1.userId, name: "Rytter 1", birth_year: 2010 });
  await seed("riders", { id: "dw_r2", user_id: R2.userId, name: "Rytter 2", birth_year: 2009 });
  await seed("guardians", {
    rider_id: "dw_r1",
    user_id: PARENT.userId,
    name: "Forælder",
    confirmed_at: new Date(),
  });
  for (const r of ["dw_r1", "dw_r2"]) {
    for (const n of [1, 2, 3])
      await seed("planned_sessions", {
        id: `${r}_s${n}`,
        rider_id: r,
        on_date: DAY,
        sport: "bike",
        title: "Pas",
      });
    await seed("device_workouts", {
      id: `${r}_w1`,
      rider_id: r,
      planned_session_id: `${r}_s1`,
      provider: "garmin",
      external_workout_id: `${r}-1`,
      scheduled_on: DAY,
    });
  }
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe("what was sent to a rider's Garmin", () => {
  it("is read by the rider, a coach and a parent the rider shares with, and nobody else", async () => {
    expect(await count(R1)).toBe(1);
    expect(await count(R1, "rider_id = 'dw_r2'")).toBe(0);
    expect(await count(R2)).toBe(1);
    expect(await count(COACH)).toBe(2);
    expect(await count(PARENT)).toBe(1);
    expect(await count(PARENT, "rider_id = 'dw_r2'")).toBe(0);
    expect(await count(OTHER)).toBe(0);
  });

  it("is written by the rider and by a coach", async () => {
    const own = row("dw_r1", "dw_r1_s2");
    expect((await asApp(app, R1, (c) => c.query(own.text, own.values))).rowCount).toBe(1);
    const coach = row("dw_r2", "dw_r2_s2");
    expect((await asApp(app, COACH, (c) => c.query(coach.text, coach.values))).rowCount).toBe(1);
  });

  it("is refused to a teammate, a parent and another member", async () => {
    for (const ctx of [R2, PARENT, OTHER]) {
      const q = row("dw_r1", "dw_r1_s3");
      expect(await expectSqlError(asApp(app, ctx, (c) => c.query(q.text, q.values)))).toBe("42501");
      const changed = await asApp(app, ctx, (c) =>
        c.query(`update device_workouts set last_error = 'x' where rider_id = 'dw_r1'`),
      );
      expect(changed.rowCount).toBe(0);
      const gone = await asApp(app, ctx, (c) =>
        c.query(`delete from device_workouts where rider_id = 'dw_r1'`),
      );
      expect(gone.rowCount).toBe(0);
    }
  });

  it("names only one of the rider's own sessions", async () => {
    const q = row("dw_r1", "dw_r2_s3");
    for (const ctx of [R1, COACH])
      expect(await expectSqlError(asApp(app, ctx, (c) => c.query(q.text, q.values)))).toBe("42501");
  });

  it("stays without its session when the session is deleted, so the workout can come off", async () => {
    const deleted = await asAppCommit(app, COACH, (c) =>
      c.query(`delete from planned_sessions where id = 'dw_r1_s1'`),
    );
    expect(deleted.rowCount).toBe(1);
    const { rows } = await admin.query(
      `select planned_session_id, external_workout_id from device_workouts where id = 'dw_r1_w1'`,
    );
    expect(rows).toEqual([{ planned_session_id: null, external_workout_id: "dw_r1-1" }]);
    expect(await count(R1, "planned_session_id is null")).toBe(1);
  });
});
