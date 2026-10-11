import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { cleanupExpiredDemos, createDemoWorkspace } from "@/modules/demo/service";
import { adminPool, appClient, authClient } from "../helpers/db";

/**
 * The demo's clean-up runs in the database (drizzle/0042, ADR 0084):
 * `delete_expired_demo()` deletes a demo whose time is up with its
 * accounts and every audit row about them. The auth role may call it,
 * and it can reach nothing else: a real club and a demo still being shown
 * are refused, and the application role cannot call it at all.
 */

let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  // A demo opens only on an installation somebody owns (backlog P1-09).
  await admin.query(
    `insert into users (id, name, email, email_verified, platform_role)
     values ('user_demo_cleanup_owner', 'Ejer', 'demo-cleanup-owner@example.org', false, 'owner')
     on conflict (id) do update set platform_role = 'owner'`,
  );
  await admin.query(
    `insert into organizations (id, name, slug) values ('org_demo_refuse', 'Klub', 'klub-demo-refuse')
     on conflict do nothing`,
  );
});

afterAll(async () => {
  await admin.query("delete from organizations where id = 'org_demo_refuse'");
  await admin.query("delete from users where id = 'user_demo_cleanup_owner'");
  await admin.end();
});

describe("the demo's clean-up in the database", () => {
  it("refuses a real club and a demo whose time is not up, then takes the demo when it is", async () => {
    expect(await createDemoWorkspace("da")).not.toBeNull();
    const newest = await admin.query(
      `select organization_id from demo_workspaces order by created_at desc limit 1`,
    );
    const demo = newest.rows[0].organization_id as string;

    const auth = await authClient();
    try {
      for (const id of ["org_demo_refuse", demo]) {
        const { rows } = await auth.query(`select delete_expired_demo($1) as deleted`, [id]);
        expect(rows[0].deleted).toBe(false);
      }
    } finally {
      await auth.end();
    }
    const standing = await admin.query(
      `select count(*)::int as n from organizations where id = any($1)`,
      [["org_demo_refuse", demo]],
    );
    expect(standing.rows[0].n).toBe(2);
    const trail = await admin.query(`select count(*)::int as n from audit_log where org_id = $1`, [
      demo,
    ]);
    expect(trail.rows[0].n).toBeGreaterThan(0);

    await admin.query(
      `update demo_workspaces set expires_at = now() - interval '1 minute' where organization_id = $1`,
      [demo],
    );
    expect(await cleanupExpiredDemos()).toBe(1);
    const gone = await admin.query(`select count(*)::int as n from audit_log where org_id = $1`, [
      demo,
    ]);
    expect(gone.rows[0].n).toBe(0);
  });

  it("is not the application role's to call", async () => {
    const app = await appClient();
    try {
      await expect(app.query(`select delete_expired_demo('org_demo_refuse')`)).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await app.end();
    }
  });
});
