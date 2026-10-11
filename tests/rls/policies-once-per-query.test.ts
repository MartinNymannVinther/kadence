import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { adminPool, appClient, asApp } from "../helpers/db";

/**
 * The policies ask who the caller is once per query (drizzle/0045,
 * docs/adr/0083). A helper with no argument, written bare in a policy,
 * is called again for every row the query looks at; written as a
 * sub-select it is an InitPlan, run once. The answers are the same, which
 * the rest of tests/rls proves; this guards the form, so a policy added
 * later does not quietly go back to asking per row.
 */

const HELPERS = [
  "app_current_org_id",
  "app_current_user_id",
  "app_is_coach",
  "app_is_coach_somewhere",
  "app_is_platform_owner",
  "app_demo_room",
];

let admin: Pool;
let app: Client;

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe("policies", () => {
  it("call no helper without an argument except inside a sub-select", async () => {
    const bare = `(?<![[:alnum:]_])(?<!SELECT )(${HELPERS.join("|")})\\(\\)`;
    const { rows } = await admin.query(
      `select c.relname || '.' || p.polname as policy
       from pg_policy p join pg_class c on c.oid = p.polrelid
       where c.relnamespace = 'public'::regnamespace
         and (coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~ $1
           or coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') ~ $1)
       order by 1`,
      [bare],
    );
    expect(rows.map((r) => r.policy)).toEqual([]);
  });

  it("still name the helpers: the rewrite wrapped them, it did not drop them", async () => {
    const { rows } = await admin.query(
      `select count(*)::int as n from pg_policy p
       where pg_get_expr(p.polqual, p.polrelid) like '%( SELECT app_is_coach() AS app_is_coach)%'`,
    );
    expect(rows[0].n).toBeGreaterThan(10);
  });

  it("ask whether the caller is a coach once for the whole query", async () => {
    const plan = await asApp(app, { orgId: "org_none", userId: "user_none" }, async (c) => {
      const { rows } = await c.query("explain (costs off) select id from team_settings");
      return rows.map((r) => r["QUERY PLAN"] as string).join("\n");
    });
    expect(plan).toMatch(/InitPlan/);
  });
});
