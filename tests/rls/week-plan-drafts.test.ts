import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { adminPool, appClient, asApp, asAppCommit, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The week planner's shared draft (drizzle/0038; ADR 0043, amended
 * 2026-10-07), proven as the application role with raw SQL: the team's
 * coaches read and write it; its riders and parents read none — not even
 * a draft begun from the rider's own calendar — and write none; a coach
 * of another team neither reads nor writes one, nor names that team's
 * rider in one; one draft per week and scope; and every save lands in the
 * audit log.
 */

const A = { orgId: "org_wpd_a", userId: "user_wpd_coach_a" };
const ASSISTANT = { orgId: A.orgId, userId: "user_wpd_assistant_a" };
const RIDER = { orgId: A.orgId, userId: "user_wpd_rider_a" };
const PARENT = { orgId: A.orgId, userId: "user_wpd_parent_a" };
const B = { orgId: "org_wpd_b", userId: "user_wpd_coach_b" };

const MONDAY = "2026-11-09";
const PAYLOAD = { riderIds: ["wpd_rider_a"], items: [] };

const draft = (orgId: string, values: Record<string, unknown> = {}) =>
  insertSql("week_plan_drafts", {
    org_id: orgId,
    week_monday: MONDAY,
    payload: PAYLOAD,
    ...values,
  });

let admin: Pool;
let app: Client;

async function seed(q: { text: string; values: unknown[] }) {
  await admin.query(q.text, q.values);
}

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, A.orgId, A.userId, "owner");
  await seedPerson(admin, A.orgId, ASSISTANT.userId, "admin");
  await seedPerson(admin, A.orgId, RIDER.userId, "member");
  await seedPerson(admin, A.orgId, PARENT.userId, "member");
  await seedPerson(admin, B.orgId, B.userId, "owner");
  for (const [orgId, id, userId] of [
    [A.orgId, "wpd_rider_a", RIDER.userId],
    [A.orgId, "wpd_rider_a2", null],
    [B.orgId, "wpd_rider_b", null],
  ] as const)
    await seed(
      insertSql("riders", { org_id: orgId, id, user_id: userId, name: id, birth_year: 2010 }),
    );
  await seed(
    insertSql("guardians", {
      org_id: A.orgId,
      rider_id: "wpd_rider_a",
      user_id: PARENT.userId,
      name: "Mor",
      confirmed_at: new Date(),
    }),
  );
  await admin.query(`update riders set share_wellbeing = true where id = 'wpd_rider_a'`);
  await seed(draft(A.orgId, { id: "wpd_team_a", updated_by: A.userId }));
  await seed(draft(A.orgId, { id: "wpd_rider_draft_a", rider_id: "wpd_rider_a" }));
  await seed(draft(B.orgId, { id: "wpd_team_b" }));
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe("week_plan_drafts", () => {
  it("is read by the team's coaches, the head coach and the assistant alike", async () => {
    for (const who of [A, ASSISTANT]) {
      const rows = await asApp(app, who, (c) =>
        c.query(`select id from week_plan_drafts order by id`),
      );
      expect(rows.rows.map((r) => r.id)).toEqual(["wpd_rider_draft_a", "wpd_team_a"]);
    }
  });

  it("is written by the team's coaches: a save, another coach's save over it, a clear", async () => {
    await asApp(app, ASSISTANT, async (c) => {
      const changed = await c.query(
        `update week_plan_drafts set payload = $1, updated_by = $2, updated_at = now() where id = 'wpd_team_a'`,
        [{ riderIds: [], items: [] }, ASSISTANT.userId],
      );
      expect(changed.rowCount).toBe(1);
      const q = draft(A.orgId, { week_monday: "2026-11-16", rider_id: "wpd_rider_a2" });
      expect((await c.query(q.text, q.values)).rowCount).toBe(1);
      const gone = await c.query(`delete from week_plan_drafts where id = 'wpd_team_a'`);
      expect(gone.rowCount).toBe(1);
    });
  });

  it("is read by no rider or parent, not even the draft begun from the rider's own calendar", async () => {
    for (const who of [RIDER, PARENT]) {
      const rows = await asApp(app, who, (c) => c.query(`select id from week_plan_drafts`));
      expect(rows.rows).toEqual([]);
    }
  });

  it("is written by no rider or parent", async () => {
    for (const who of [RIDER, PARENT]) {
      const q = draft(A.orgId, { week_monday: "2026-11-23" });
      expect(await expectSqlError(asApp(app, who, (c) => c.query(q.text, q.values)))).toBe("42501");
      const changed = await asApp(app, who, (c) =>
        c.query(`update week_plan_drafts set payload = '{}' where id = 'wpd_team_a'`),
      );
      expect(changed.rowCount).toBe(0);
      const gone = await asApp(app, who, (c) =>
        c.query(`delete from week_plan_drafts where id = 'wpd_team_a'`),
      );
      expect(gone.rowCount).toBe(0);
    }
  });

  it("is neither read nor written by a coach of another team", async () => {
    const rows = await asApp(app, B, (c) =>
      c.query(`select id from week_plan_drafts where org_id = $1`, [A.orgId]),
    );
    expect(rows.rows).toEqual([]);
    const changed = await asApp(app, B, (c) =>
      c.query(`update week_plan_drafts set payload = '{}' where id = 'wpd_team_a'`),
    );
    expect(changed.rowCount).toBe(0);
    const gone = await asApp(app, B, (c) =>
      c.query(`delete from week_plan_drafts where id = 'wpd_team_a'`),
    );
    expect(gone.rowCount).toBe(0);
    const q = draft(A.orgId, { week_monday: "2026-11-23" });
    expect(await expectSqlError(asApp(app, B, (c) => c.query(q.text, q.values)))).toBe("42501");
  });

  it("reads nothing for a context naming a team the caller is not in, or none", async () => {
    const stranger = { orgId: A.orgId, userId: B.userId };
    const rows = await asApp(app, stranger, (c) => c.query(`select 1 from week_plan_drafts`));
    expect(rows.rows).toEqual([]);
    const none = await asApp(app, null, (c) => c.query(`select 1 from week_plan_drafts`));
    expect(none.rows).toEqual([]);
  });

  it("never names another team's rider", async () => {
    const q = draft(A.orgId, { week_monday: "2026-11-23", rider_id: "wpd_rider_b" });
    expect(await expectSqlError(asApp(app, A, (c) => c.query(q.text, q.values)))).toBe("42501");
    const moved = await asApp(app, A, (c) =>
      c
        .query(
          `update week_plan_drafts set rider_id = 'wpd_rider_b' where id = 'wpd_rider_draft_a'`,
        )
        .catch((error: { code?: string }) => ({ rowCount: 0, code: error.code })),
    );
    expect("code" in moved ? moved.code : "NO_ERROR").toBe("42501");
  });

  it("is one draft per team, week and scope: the team's own counts as one", async () => {
    const team = draft(A.orgId, { week_monday: MONDAY });
    expect(await expectSqlError(asApp(app, A, (c) => c.query(team.text, team.values)))).toBe(
      "23505",
    );
    const rider = draft(A.orgId, { rider_id: "wpd_rider_a" });
    expect(await expectSqlError(asApp(app, A, (c) => c.query(rider.text, rider.values)))).toBe(
      "23505",
    );
    // Another rider's draft for the same week is a draft of its own.
    const other = draft(A.orgId, { rider_id: "wpd_rider_a2" });
    expect(await expectSqlError(asApp(app, A, (c) => c.query(other.text, other.values)))).toBe(
      "NO_ERROR",
    );
  });

  it("refuses a week that does not start on a Monday, and a payload of the wrong kind or size", async () => {
    const refused = async (values: Record<string, unknown>) => {
      const q = draft(A.orgId, { week_monday: "2026-11-30", ...values });
      return expectSqlError(asApp(app, A, (c) => c.query(q.text, q.values)));
    };
    expect(await refused({ week_monday: "2026-11-10" })).toBe("23514");
    expect(await refused({ payload: "[]" })).toBe("23514");
    expect(await refused({ payload: { pad: "x".repeat(530_000) } })).toBe("23514");
  });

  it("goes with the rider when the rider is erased", async () => {
    await seed(
      insertSql("riders", { org_id: A.orgId, id: "wpd_rider_gone", name: "x", birth_year: 2010 }),
    );
    await seed(draft(A.orgId, { id: "wpd_gone", rider_id: "wpd_rider_gone" }));
    await admin.query(`delete from riders where id = 'wpd_rider_gone'`);
    const rows = await admin.query(`select 1 from week_plan_drafts where id = 'wpd_gone'`);
    expect(rows.rows).toEqual([]);
  });

  it("records every save in the audit log, with who made it", async () => {
    await asAppCommit(app, ASSISTANT, (c) =>
      c.query(
        `update week_plan_drafts set updated_by = $1, updated_at = now() where id = 'wpd_team_a'`,
        [ASSISTANT.userId],
      ),
    );
    const rows = await admin.query(
      `select action, actor_user_id, org_id from audit_log
       where entity_type = 'week_plan_drafts' and entity_id = 'wpd_team_a' and action = 'week_plan_drafts.update'`,
    );
    expect(rows.rows).toContainEqual({
      action: "week_plan_drafts.update",
      actor_user_id: ASSISTANT.userId,
      org_id: A.orgId,
    });
  });
});
