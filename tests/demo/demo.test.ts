import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import {
  cleanupExpiredDemos,
  createDemoWorkspace,
  demoLandingUrl,
  isDemoWorkspace,
} from "@/modules/demo/service";
import { adminPool } from "../helpers/db";

/**
 * The demo, built through the ordinary sign-up path: a real workspace, a
 * throwaway account, and a date it stops existing. The suite runs with
 * DEMO=on (see the test environment); the shipped default is off and
 * proven in tests/core/env. A demo opens on a seeded portfolio, written
 * through the ordinary services (src/modules/demo/seed.ts).
 */

let admin: Pool;
let orgId: string;
let userId: string;

beforeAll(async () => {
  admin = adminPool();
});

afterAll(async () => {
  await admin.end();
});

describe("a demo workspace", () => {
  it("is created with a signed-in guest, a portfolio in it, and lands on the overview", async () => {
    const demo = await createDemoWorkspace("da");
    expect(demo).not.toBeNull();
    expect(demo!.headers.get("cookie")).toMatch(/better-auth/);
    const row = await admin.query(
      `select organization_id, user_id from demo_workspaces order by created_at desc limit 1`,
    );
    orgId = row.rows[0].organization_id;
    userId = row.rows[0].user_id;
    expect(await isDemoWorkspace(orgId)).toBe(true);
    expect(demoLandingUrl("da").pathname).toBe("/today");
    expect(demoLandingUrl("en").pathname).toBe("/en/today");
    const seeded = await admin.query(
      `select (select count(*)::int from riders where org_id = $1) as riders,
              (select count(*)::int from planned_sessions where org_id = $1) as sessions,
              (select count(*)::int from planned_sessions where org_id = $1 and activity_id is not null) as done,
              (select count(*)::int from checkins where org_id = $1) as checkins,
              (select count(*)::int from workout_templates where org_id = $1 and source = 'dcu') as dcu`,
      [orgId],
    );
    expect(seeded.rows[0].riders).toBe(6);
    expect(seeded.rows[0].sessions).toBeGreaterThan(150);
    expect(seeded.rows[0].done).toBeGreaterThan(100);
    expect(seeded.rows[0].checkins).toBe(6 * 14);
    expect(seeded.rows[0].dcu).toBe(3);
  });

  it("is deleted whole when its time is up, guest account included", async () => {
    await admin.query(
      `update demo_workspaces set expires_at = now() - interval '1 minute' where organization_id = $1`,
      [orgId],
    );
    expect(await cleanupExpiredDemos()).toBe(1);
    const org = await admin.query(`select 1 from organizations where id = $1`, [orgId]);
    const user = await admin.query(`select 1 from users where id = $1`, [userId]);
    const rows = await admin.query(`select 1 from riders where org_id = $1`, [orgId]);
    expect([org.rowCount, user.rowCount, rows.rowCount]).toEqual([0, 0, 0]);
  });
});
