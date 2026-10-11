import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { adminPool, appClient } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The trail keeps who changed what, never the file (ADR 0084). A ride's
 * FIT file, a club's picture and an activity's thinned samples are
 * written to the audit log without their heavy column, and without the
 * trigger first turning megabytes of bytea into hex only to throw it
 * away (drizzle/0042). Every other column, and every other table, is
 * recorded before and after as it always was.
 */

let admin: Pool;
const CTX = { orgId: "org_audit_files", userId: "user_audit_files" };
const DAY = "2026-11-02";

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, CTX.orgId, CTX.userId, "owner");
  await admin.query(
    insertSql("riders", { id: "rider_af", org_id: CTX.orgId, name: "R", birth_year: 2009 }),
  );
});

afterAll(async () => {
  await admin.end();
});

async function addActivity(id: string, streams: unknown = null) {
  await admin.query(
    insertSql("activities", {
      id,
      org_id: CTX.orgId,
      rider_id: "rider_af",
      started_at: `${DAY}T08:00:00Z`,
      on_date: DAY,
      sport: "bike",
      moving_seconds: 3600,
      source: "fit",
      streams,
    }),
  );
}

/** Runs one statement as the application role in the workspace, and times it. */
async function asCoach(text: string, values: unknown[]): Promise<number> {
  const client = await appClient();
  try {
    await client.query("begin");
    await client.query(
      "select set_config('app.org_id', $1, true), set_config('app.user_id', $2, true)",
      [CTX.orgId, CTX.userId],
    );
    const started = performance.now();
    await client.query(text, values);
    const elapsed = performance.now() - started;
    await client.query("commit");
    return elapsed;
  } finally {
    await client.end();
  }
}

async function trailOf(entityType: string, entityId: string) {
  const { rows } = await admin.query(
    `select action, before_data, after_data from audit_log
     where entity_type = $1 and entity_id = $2 order by id`,
    [entityType, entityId],
  );
  return rows as Array<{ action: string; before_data: object | null; after_data: object | null }>;
}

describe("the audit trail without files", () => {
  it("records a 5 MB file's insert without the bytes, and quickly", async () => {
    await addActivity("act_af_big");
    const file = insertSql("activity_files", {
      id: "file_af_big",
      org_id: CTX.orgId,
      rider_id: "rider_af",
      activity_id: "act_af_big",
      file_name: "ride.fit",
      sha256: "sha_af_big",
      bytes: randomBytes(5 * 1024 * 1024),
    });
    const elapsed = await asCoach(file.text, file.values);
    console.log(
      `audit/files: a 5 MB file inserted as the application role in ${elapsed.toFixed(0)} ms`,
    );

    const [row, ...more] = await trailOf("activity_files", "file_af_big");
    expect(more).toHaveLength(0);
    expect(row!.after_data).not.toHaveProperty("bytes");
    expect(row!.after_data).toMatchObject({ file_name: "ride.fit", rider_id: "rider_af" });
    expect(JSON.stringify(row!.after_data).length).toBeLessThan(2_000);
    // Loose on purpose: a slow machine must not fail this, while a
    // trigger that hex-encodes the file again costs a multiple of it.
    expect(elapsed).toBeLessThan(1_500);

    // The table keeps the file: the trigger emptied its own copy only.
    const kept = await admin.query(
      `select octet_length(bytes) as n from activity_files where id = 'file_af_big'`,
    );
    expect(Number(kept.rows[0].n)).toBe(5 * 1024 * 1024);
  });

  it("leaves the file and the samples out of an update and a delete, and keeps the rest", async () => {
    await addActivity("act_af_streams", { t: [0, 1, 2], w: [100, 200, 300] });
    await asCoach(`update activities set note = 'tunge ben' where id = 'act_af_streams'`, []);
    await asCoach(`delete from activities where id = 'act_af_streams'`, []);

    const trail = await trailOf("activities", "act_af_streams");
    expect(trail.map((r) => r.action)).toEqual([
      "activities.insert",
      "activities.update",
      "activities.delete",
    ]);
    for (const r of trail) {
      expect(r.before_data ?? {}).not.toHaveProperty("streams");
      expect(r.after_data ?? {}).not.toHaveProperty("streams");
    }
    expect(trail[1]!.before_data).toMatchObject({ note: "" });
    expect(trail[1]!.after_data).toMatchObject({ note: "tunge ben" });
    expect(trail[2]!.before_data).toMatchObject({ id: "act_af_streams", rider_id: "rider_af" });
  });

  it("knows every heavy column on an audited table by name", async () => {
    // A new bytea column, or another `streams`, on a table with the audit
    // trigger must be named in audit_row_change() too (drizzle/0042), or
    // the trigger goes back to serialising it before redaction drops it.
    const { rows } = await admin.query(`
      select distinct c.relname || '.' || a.attname as col
      from pg_trigger t
      join pg_proc p on p.oid = t.tgfoid and p.proname = 'audit_row_change'
      join pg_class c on c.oid = t.tgrelid
      join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
      where a.atttypid = 'bytea'::regtype or a.attname in ('bytes', 'streams')
      order by 1
    `);
    expect(rows.map((r) => r.col)).toEqual([
      "activities.streams",
      "activity_files.bytes",
      "org_images.bytes",
    ]);
    const source = await admin.query(
      `select prosrc from pg_proc where proname = 'audit_row_change'`,
    );
    for (const name of ["activity_files", "org_images", "NEW.bytes", "NEW.streams"]) {
      expect(source.rows[0].prosrc).toContain(name);
    }
  });

  it("lets erase_rider find a rider's rows through an index", async () => {
    const client = await admin.connect();
    try {
      await client.query("begin");
      await client.query("set local enable_seqscan = off");
      const { rows } = await client.query(
        // Without the workspace's own index in the way: on a test
        // database that index alone is cheapest, on a real trail it reads
        // the workspace's every row.
        `explain select id from audit_log
         where before_data ->> 'rider_id' = $1 or after_data ->> 'rider_id' = $1`,
        ["rider_af"],
      );
      const plan = rows.map((r) => r["QUERY PLAN"]).join("\n");
      expect(plan).toContain("audit_log_before_rider_idx");
      expect(plan).toContain("audit_log_after_rider_idx");
      await client.query("rollback");
    } finally {
      client.release();
    }
  });
});
