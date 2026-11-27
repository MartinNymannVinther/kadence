import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { adminPool, appClient, asApp, asAppCommit, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A person's own assistant connections (drizzle/0063, docs/adr/0118),
 * proven as the application role with raw SQL: the person reads, makes and
 * removes their own; a coach of the same team sees none of a rider's, nor
 * does a teammate; nobody makes one in another's name or another
 * workspace's; and Better Auth's OAuth tables are out of the application
 * role's reach altogether.
 */

const A = { orgId: "org_aic_a", userId: "user_aic_coach_a" };
const RIDER = { orgId: A.orgId, userId: "user_aic_rider_a" };
const MATE = { orgId: A.orgId, userId: "user_aic_mate_a" };
const B = { orgId: "org_aic_b", userId: "user_aic_coach_b" };
const CLIENT = "aic_client";

const connection = (orgId: string, userId: string, id: string) =>
  insertSql("ai_connections", {
    id,
    org_id: orgId,
    user_id: userId,
    client_id: CLIENT,
    client_name: "Claude",
    client_host: "claude.ai",
    scopes: "{kadence:read}",
  });

let admin: Pool;
let app: Client;

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, A.orgId, A.userId, "owner");
  await seedPerson(admin, A.orgId, RIDER.userId, "member");
  await seedPerson(admin, A.orgId, MATE.userId, "member");
  await seedPerson(admin, B.orgId, B.userId, "owner");
  await admin.query(
    `insert into oauth_clients (id, client_id, redirect_uris, name) values ($1, $2, $3, $4)`,
    ["aic_client_row", CLIENT, ["https://claude.ai/api/mcp/auth_callback"], "Claude"],
  );
  const own = connection(A.orgId, RIDER.userId, "aic_rider");
  await admin.query(own.text, own.values);
  const mate = connection(A.orgId, MATE.userId, "aic_mate");
  await admin.query(mate.text, mate.values);
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

const ids = (who: { orgId: string; userId: string }) =>
  asApp(app, who, async (c) =>
    (await c.query(`select id from ai_connections order by id`)).rows.map((r) => r.id),
  );

describe("ai_connections", () => {
  it("is read by the person alone", async () => {
    expect(await ids(RIDER)).toEqual(["aic_rider"]);
    expect(await ids(MATE)).toEqual(["aic_mate"]);
  });

  it("is not seen by the team's coach, nor by another team", async () => {
    expect(await ids(A)).toEqual([]);
    expect(await ids(B)).toEqual([]);
  });

  it("is made by the person for themselves in their own workspace", async () => {
    await asApp(app, A, async (c) => {
      const q = connection(A.orgId, A.userId, "aic_coach_own");
      await c.query(q.text, q.values);
    });
  });

  it("is never made in another person's name or another workspace", async () => {
    for (const q of [
      connection(A.orgId, RIDER.userId, "aic_forged"),
      connection(B.orgId, A.userId, "aic_elsewhere"),
    ]) {
      const code = await asApp(app, A, (c) => expectSqlError(c.query(q.text, q.values)));
      expect(code).toBe("42501");
    }
  });

  it("is removed only by the person", async () => {
    const removed = await asApp(app, A, (c) =>
      c.query(`delete from ai_connections where id = 'aic_rider'`),
    );
    expect(removed.rowCount).toBe(0);
    expect(await ids(RIDER)).toEqual(["aic_rider"]);
  });

  it("names only the scopes Kadence has", async () => {
    const q = insertSql("ai_connections", {
      id: "aic_bad_scope",
      org_id: A.orgId,
      user_id: A.userId,
      client_id: CLIENT,
      client_name: "Claude",
      client_host: "claude.ai",
      scopes: "{kadence:delete}",
    });
    const code = await asApp(app, A, (c) => expectSqlError(c.query(q.text, q.values)));
    expect(code).toBe("23514");
  });

  it("marks a row written through an assistant in the audit trail", async () => {
    await asAppCommit(app, RIDER, async (c) => {
      await c.query(`select set_config('app.channel', 'mcp', true)`);
      await c.query(`update ai_connections set last_used_at = now() where id = 'aic_rider'`);
    });
    const rows = await admin.query(
      `select actor_type from audit_log where entity_id = 'aic_rider' and action = 'ai_connections.update'`,
    );
    expect(rows.rows.map((r) => r.actor_type)).toEqual(["ai_connection"]);
  });
});

describe("Better Auth's OAuth tables", () => {
  it.each([
    "jwks",
    "oauth_clients",
    "oauth_access_tokens",
    "oauth_refresh_tokens",
    "oauth_consents",
    "oauth_resources",
    "oauth_client_resources",
    "oauth_client_assertions",
  ])("are out of the application role's reach: %s", async (table) => {
    const code = await asApp(app, A, (c) => expectSqlError(c.query(`select * from ${table}`)));
    expect(code).toBe("42501");
  });
});
