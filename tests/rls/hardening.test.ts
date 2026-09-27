import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The first security review's findings, each proven closed (drizzle/0007,
 * docs/adr/0019): no temporary tables to shadow what a definer function
 * reads, sharing that only the rider changes, a rider row the rider can
 * only change in its thresholds and sharing, a birth year that withdraws
 * confirmations, a parent who sees no thresholds without shared training,
 * a comment that cannot be moved onto a teammate's session, audit rows in
 * one's own name only, a guardian link confirmed for the person who holds
 * it, and a team's model settings that are the coaches'.
 */

const ORG = "org_hardening";
const COACH = { orgId: ORG, userId: "user_hard_coach" };
const R1 = { orgId: ORG, userId: "user_hard_r1" };
const R2 = { orgId: ORG, userId: "user_hard_r2" };
const PARENT = { orgId: ORG, userId: "user_hard_parent" };
const LATE = { orgId: ORG, userId: "user_hard_late" };

let admin: Pool;
let app: Client;

async function seed(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ORG, ...values });
  await admin.query(q.text, q.values);
}

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [R1, R2, PARENT, LATE]) await seedPerson(admin, ORG, p.userId, "member");
  await seed("riders", {
    id: "h1",
    user_id: R1.userId,
    name: "H1",
    birth_year: 2010,
    ftp_watts: 250,
  });
  await seed("riders", { id: "h2", user_id: R2.userId, name: "H2", birth_year: 2009 });
  await seed("guardians", {
    id: "hg",
    rider_id: "h1",
    user_id: PARENT.userId,
    name: "Mor",
    confirmed_at: new Date(),
  });
  await seed("guardians", { id: "hg_open", rider_id: "h1", name: "Far" });
  await seed("planned_sessions", {
    id: "hs2",
    rider_id: "h2",
    on_date: "2026-11-02",
    sport: "bike",
    title: "x",
  });
  await seed("comments", {
    id: "hc1",
    rider_id: "h1",
    author_id: R1.userId,
    on_date: "2026-11-02",
    body: "hej",
  });
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe("definer functions cannot be fooled", () => {
  it("gives the runtime role no temporary tables to shadow memberships with", async () => {
    const code = await expectSqlError(
      asApp(app, R1, (c) =>
        c.query("create temp table memberships (organization_id text, user_id text, role text)"),
      ),
    );
    expect(code).toBe("42501");
  });

  it("puts pg_temp last in every definer function's search path", async () => {
    const rows = await admin.query(
      `select p.proname, p.proconfig from pg_proc p
       where p.pronamespace = 'public'::regnamespace and p.prosecdef`,
    );
    for (const row of rows.rows) {
      const path = (row.proconfig as string[] | null)?.find((c) => c.startsWith("search_path="));
      expect(path, row.proname).toMatch(/pg_temp$/);
    }
  });
});

describe("the rider row", () => {
  it("lets only the rider change what the parents see", async () => {
    const code = await expectSqlError(
      asApp(app, COACH, (c) => c.query(`update riders set share_wellbeing = true where id = 'h1'`)),
    );
    expect(code).toBe("42501");
    const own = await asApp(app, R1, (c) =>
      c.query(`update riders set share_wellbeing = true where id = 'h1'`),
    );
    expect(own.rowCount).toBe(1);
  });

  it("lets a rider change thresholds and sharing, nothing else of their own row", async () => {
    const ok = await asApp(app, R1, (c) =>
      c.query(`update riders set ftp_watts = 260 where id = 'h1'`),
    );
    expect(ok.rowCount).toBe(1);
    for (const change of [
      "birth_year = 2000",
      "archived = true",
      "name = 'x'",
      "category_override = 'U23-1'",
    ]) {
      const code = await expectSqlError(
        asApp(app, R1, (c) => c.query(`update riders set ${change} where id = 'h1'`)),
      );
      expect(code, change).toBe("42501");
    }
  });

  it("withdraws the parents' confirmations when the birth year changes", async () => {
    const confirmed = await asApp(app, COACH, async (c) => {
      await c.query(`update riders set birth_year = 2011 where id = 'h1'`);
      return c.query(`select confirmed_at from guardians where id = 'hg'`);
    });
    expect(confirmed.rows[0].confirmed_at).toBeNull();
  });

  it("shows a parent no thresholds while the rider does not share training", async () => {
    const hidden = await asApp(app, R1, async (c) => {
      await c.query(`update riders set share_training = false where id = 'h1'`);
      await c.query("select set_config('app.user_id', $1, true)", [PARENT.userId]);
      return c.query(`select ftp_watts from riders`);
    });
    expect(hidden.rows).toEqual([]);
  });
});

describe("links, comments, audit and settings", () => {
  it("withdraws a confirmation made before a person held the link", async () => {
    const row = await asApp(app, COACH, async (c) => {
      await c.query(`update guardians set user_id = $1 where id = 'hg_open'`, [LATE.userId]);
      return c.query(`select confirmed_at from guardians where id = 'hg_open'`);
    });
    expect(row.rows[0].confirmed_at).toBeNull();
    const code = await expectSqlError(
      asApp(app, R1, (c) =>
        c.query(`update guardians set confirmed_at = now() where id = 'hg_open'`),
      ),
    );
    expect(code).toBe("42501");
  });

  it("refuses a comment moved onto a teammate's session", async () => {
    const code = await expectSqlError(
      asApp(app, R1, (c) =>
        c.query(`update comments set on_date = null, planned_session_id = 'hs2' where id = 'hc1'`),
      ),
    );
    expect(["42501", "23514"]).toContain(code);
  });

  it("writes audit rows in the caller's own name only", async () => {
    const q = (actor: string) =>
      asApp(app, R1, (c) =>
        c.query(
          `insert into audit_log (org_id, actor_user_id, actor_type, action, entity_type, entity_id)
           values ($1, $2, 'user', 'test', 'test', 'x')`,
          [ORG, actor],
        ),
      );
    expect(await expectSqlError(q(COACH.userId))).toBe("42501");
    expect((await q(R1.userId)).rowCount).toBe(1);
  });

  it("leaves the team's model to the coaches", async () => {
    const q = insertSql("workspace_llm_settings", { org_id: ORG, provider: "ollama", model: "x" });
    expect(await expectSqlError(asApp(app, R1, (c) => c.query(q.text, q.values)))).toBe("42501");
    expect((await asApp(app, COACH, (c) => c.query(q.text, q.values))).rowCount).toBe(1);
  });
});
