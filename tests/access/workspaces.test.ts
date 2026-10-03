import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import {
  canCreateWorkspace,
  defaultWorkspaceId,
  markWorkspaceUsed,
} from "@/core/access/workspaces";
import { adminPool } from "../helpers/db";
import { seedMember, seedWorkspace } from "../helpers/workspace";

/**
 * Who may create a workspace, and which one a login opens
 * (src/core/access/workspaces.ts, docs/adr/0048).
 */

let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  await seedWorkspace(admin, "ws_owner");
  await admin.query(`update users set platform_role = 'owner' where id = 'user_ws_owner'`);
  const first = await seedWorkspace(admin, "ws_coach");
  const second = await seedWorkspace(admin, "ws_second");
  await seedMember(admin, second.orgId, "ws_coach_2", "admin");
  await admin.query(
    `update memberships set user_id = 'user_ws_coach', created_at = now() + interval '1 minute' where id = 'mem_ws_coach_2'`,
  );
  await admin.query(
    `insert into users (id, name, email) values ('user_ws_new', 'New', 'ws_new@example.com')`,
  );
  void first;
});

afterAll(async () => {
  await admin?.end();
});

describe("creating a workspace", () => {
  it("the installation's owner always may", async () => {
    expect(await canCreateWorkspace("user_ws_owner")).toBe(true);
  });

  it("someone who belongs to no workspace may, once: their own approved registration", async () => {
    expect(await canCreateWorkspace("user_ws_new")).toBe(true);
  });

  it("a member of a club may not make another", async () => {
    expect(await canCreateWorkspace("user_ws_coach")).toBe(false);
  });
});

describe("the workspace a login opens", () => {
  it("is the oldest membership until one has been opened", async () => {
    expect(await defaultWorkspaceId("user_ws_coach")).toBe("org_ws_coach");
  });

  it("then the one opened last", async () => {
    await markWorkspaceUsed("user_ws_coach", "org_ws_second");
    expect(await defaultWorkspaceId("user_ws_coach")).toBe("org_ws_second");
    await markWorkspaceUsed("user_ws_coach", "org_ws_coach");
    expect(await defaultWorkspaceId("user_ws_coach")).toBe("org_ws_coach");
  });

  it("is nothing for someone in no workspace", async () => {
    expect(await defaultWorkspaceId("user_ws_new")).toBeNull();
  });
});
