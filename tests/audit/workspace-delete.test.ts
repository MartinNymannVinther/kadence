import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { Pool } from "pg";
import { withOrgContext } from "@/core/db/tenant";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Deleting a workspace takes everything it holds by cascade, and the
 * trail gets one event instead of a row for every row that went
 * (drizzle/0042, ADR 0088). A row deleted while its workspace stands is
 * still recorded before and after, as every change is.
 */

let admin: Pool;
const DAY = "2026-11-02";

beforeAll(async () => {
  admin = adminPool();
});

afterAll(async () => {
  await admin.end();
});

/** A workspace with a rider, a ride with its file, a check-in and a comment. */
async function seedTeam(key: string) {
  const ctx = await seedPerson(admin, `org_${key}`, `user_${key}`, "owner");
  const rider = `rider_${key}`;
  const activity = `act_${key}`;
  const rows: Array<[string, Record<string, unknown>]> = [
    ["riders", { id: rider, name: "R", birth_year: 2009 }],
    [
      "activities",
      {
        id: activity,
        rider_id: rider,
        started_at: `${DAY}T08:00:00Z`,
        on_date: DAY,
        sport: "bike",
        moving_seconds: 3600,
        source: "fit",
      },
    ],
    [
      "activity_files",
      {
        rider_id: rider,
        activity_id: activity,
        file_name: "ride.fit",
        sha256: key,
        bytes: Buffer.from("fit"),
      },
    ],
    ["checkins", { rider_id: rider, on_date: DAY, energy: 4 }],
    ["comments", { rider_id: rider, activity_id: activity, body: "Flot tur" }],
  ];
  for (const [table, row] of rows) {
    await admin.query(insertSql(table, { org_id: ctx.orgId, ...row }));
  }
  return ctx;
}

async function lastAuditId(): Promise<number> {
  const { rows } = await admin.query(`select coalesce(max(id), 0)::bigint as id from audit_log`);
  return Number(rows[0].id);
}

async function countWhere(table: string, orgId: string): Promise<number> {
  const { rows } = await admin.query(
    `select count(*)::int as n from "${table}" where org_id = $1`,
    [orgId],
  );
  return rows[0].n;
}

describe("deleting a workspace", () => {
  it("cascades through every table and leaves one event that says what went", async () => {
    const ctx = await seedTeam("wsdel");
    const before = await lastAuditId();
    const sequence = await admin.query(`select last_value from audit_log_id_seq`);

    await withOrgContext(ctx, (tx) => tx.execute(sql`select delete_workspace(${ctx.orgId})`));

    for (const table of ["riders", "activities", "activity_files", "checkins", "comments"]) {
      expect(await countWhere(table, ctx.orgId), table).toBe(0);
    }
    const members = await admin.query(`select 1 from memberships where organization_id = $1`, [
      ctx.orgId,
    ]);
    expect(members.rowCount).toBe(0);

    // Two rows were written in all: the organisation's own delete, gone
    // again with the workspace's trail, and the event. The cascade wrote
    // none, where it used to write one for every row.
    const after = await admin.query(`select last_value from audit_log_id_seq`);
    expect(Number(after.rows[0].last_value) - Number(sequence.rows[0].last_value)).toBe(2);

    const { rows } = await admin.query(
      `select org_id, actor_user_id, actor_type, entity_id, after_data from audit_log
       where id > $1 order by id`,
      [before],
    );
    expect(rows).toEqual([
      {
        org_id: null,
        actor_user_id: ctx.userId,
        actor_type: "user",
        entity_id: ctx.orgId,
        after_data: {
          rows: {
            activities: 1,
            activity_files: 1,
            checkins: 1,
            comments: 1,
            memberships: 1,
            riders: 1,
          },
        },
      },
    ]);
    const shadow = await admin.query(`select 1 from audit_log where org_id = $1`, [ctx.orgId]);
    expect(shadow.rowCount).toBe(0);
  });

  it("still records a rider deleted while the workspace stands, row by row", async () => {
    const ctx = await seedTeam("wskeep");
    await withOrgContext(ctx, (tx) =>
      tx.execute(sql`delete from riders where id = 'rider_wskeep'`),
    );
    const { rows } = await admin.query(
      `select action from audit_log where org_id = $1 and action like '%.delete' order by action`,
      [ctx.orgId],
    );
    expect(rows.map((r) => r.action)).toEqual([
      "activities.delete",
      "activity_files.delete",
      "checkins.delete",
      "comments.delete",
      "riders.delete",
    ]);
  });

  it("could not have switched the triggers off instead: the cascade is a trigger too", async () => {
    // Why drizzle/0042 does not wrap the cascade in session_replication_role
    // = replica: in replica mode Postgres fires no ordinary trigger, and the
    // foreign keys' ON DELETE CASCADE is one. The workspace would go and
    // leave every row it held behind.
    const ctx = await seedTeam("wsreplica");
    const client = await admin.connect();
    try {
      await client.query("begin");
      await client.query("set local session_replication_role = replica");
      await client.query(`delete from organizations where id = $1`, [ctx.orgId]);
      const left = await client.query(`select count(*)::int as n from riders where org_id = $1`, [
        ctx.orgId,
      ]);
      expect(left.rows[0].n).toBe(1);
      await client.query("rollback");
    } finally {
      client.release();
    }
  });
});
