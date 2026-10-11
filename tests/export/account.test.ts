import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { deleteAccountIfAlone } from "@/modules/export/account";
import { adminPool } from "../helpers/db";
import { seedWorkspace } from "../helpers/workspace";

/**
 * "Slet min konto og alt om mig" (docs/adr/0080): after a person's own
 * workspace is deleted, their account goes too — but only when no other
 * team holds it, and never the installation owner's.
 */

let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  await admin.query(
    `insert into users (id, name, email, platform_role) values
       ('user_acc_alone', 'Alene', 'acc-alone@example.com', null),
       ('user_acc_owner', 'Ejer', 'acc-owner@example.com', 'owner')`,
  );
  await seedWorkspace(admin, "acc_team");
});

afterAll(async () => {
  await admin.query(
    "delete from users where id in ('user_acc_alone', 'user_acc_owner', 'user_acc_team')",
  );
  await admin.query("delete from organizations where id = 'org_acc_team'");
  await admin.end();
});

describe("deleting the account with a person's own workspace", () => {
  it("deletes an account no team holds, and says so in the log", async () => {
    expect(await deleteAccountIfAlone("user_acc_alone")).toBe(true);
    const user = await admin.query("select 1 from users where id = 'user_acc_alone'");
    expect(user.rowCount).toBe(0);
    const log = await admin.query(
      "select actor_user_id from audit_log where action = 'account.deleted' and entity_id = 'user_acc_alone'",
    );
    expect(log.rowCount).toBe(1);
  });

  it("keeps an account still on a team, and the installation owner's", async () => {
    expect(await deleteAccountIfAlone("user_acc_team")).toBe(false);
    expect(await deleteAccountIfAlone("user_acc_owner")).toBe(false);
    const left = await admin.query(
      "select count(*)::int as n from users where id in ('user_acc_team', 'user_acc_owner')",
    );
    expect(left.rows[0].n).toBe(2);
  });
});
