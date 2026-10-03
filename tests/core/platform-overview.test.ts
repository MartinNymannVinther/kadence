import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { platformOverview } from "@/core/admin/overview";
import { adminPool, appClient, expectSqlError } from "../helpers/db";
import { seedMember, seedWorkspace } from "../helpers/workspace";

/**
 * The installation's overview (drizzle/0019, docs/adr/0048): the owner
 * gets one row per club with counts only; anyone else is refused, by the
 * service and by the database function itself.
 */

let admin: Pool;
let app: Client;

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedWorkspace(admin, "ov_owner");
  await admin.query(`update users set platform_role = 'owner' where id = 'user_ov_owner'`);
  const club = await seedWorkspace(admin, "ov_club");
  await seedMember(admin, club.orgId, "ov_rider");
  await admin.query(
    `insert into riders (id, org_id, user_id, name, birth_year) values ('rider_ov', 'org_ov_club', 'user_ov_rider', 'Hemmelig Rytter', 2010)`,
  );
  await seedWorkspace(admin, "ov_demo");
  await admin.query(
    `insert into demo_workspaces (organization_id, user_id, expires_at) values ('org_ov_demo', 'user_ov_demo', now() + interval '1 day')`,
  );
});

afterAll(async () => {
  await app?.end();
  await admin?.end();
});

describe("the installation's overview", () => {
  it("gives the owner counts per club, and no person's name", async () => {
    const clubs = await platformOverview("user_ov_owner");
    const club = clubs?.find((c) => c.orgId === "org_ov_club");
    expect(club).toMatchObject({ coaches: 1, riders: 1, parents: 0, members: 2 });
    expect(JSON.stringify(clubs)).not.toContain("Hemmelig Rytter");
  });

  it("leaves demo workspaces out", async () => {
    const clubs = await platformOverview("user_ov_owner");
    expect(clubs?.some((c) => c.orgId === "org_ov_demo")).toBe(false);
  });

  it("is nothing to anyone else", async () => {
    expect(await platformOverview("user_ov_club")).toBeNull();
  });

  it("the database refuses a caller who is not the owner, and one who says nothing", async () => {
    const call = (userId: string | null) => async () => {
      await app.query("begin");
      try {
        if (userId) await app.query("select set_config('app.user_id', $1, true)", [userId]);
        return await app.query("select * from platform_overview()");
      } finally {
        await app.query("rollback");
      }
    };
    expect(await expectSqlError(call("user_ov_club")())).toBe("42501");
    expect(await expectSqlError(call(null)())).toBe("42501");
    const owner = await call("user_ov_owner")();
    expect(owner.rows.length).toBeGreaterThan(0);
  });
});
