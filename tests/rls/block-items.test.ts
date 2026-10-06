import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A block's sessions of its own (drizzle/0027, ADR 0058), proven as the
 * application role with raw SQL: a coach writes an item without a
 * template, the database still asks for a whole session when there is
 * none, a rider of the same team writes no item of either kind, and a
 * coach of another team reads none and writes none into this team's
 * block.
 */

const A = { orgId: "org_blockitems_a", userId: "user_blockitems_coach_a" };
const RIDER = { orgId: A.orgId, userId: "user_blockitems_rider_a" };
const B = { orgId: "org_blockitems_b", userId: "user_blockitems_coach_b" };

const SESSION = {
  sport: "bike",
  title: "Holdtur",
  structure: { kind: "bike", steps: [] },
  planned_minutes: 90,
  start_time: "17:30",
  meeting_place: "Klubhuset",
};

let admin: Pool;
let app: Client;

async function seed(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, values);
  await admin.query(q.text, q.values);
}

const item = (orgId: string, values: Record<string, unknown>) =>
  insertSql("training_block_items", { org_id: orgId, day: 1, ...values });

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, A.orgId, A.userId, "owner");
  await seedPerson(admin, A.orgId, RIDER.userId, "member");
  await seedPerson(admin, B.orgId, B.userId, "owner");
  await seed("riders", {
    org_id: A.orgId,
    id: "bi_rider",
    user_id: RIDER.userId,
    name: "Ida",
    birth_year: 2010,
  });
  for (const [ctx, s] of [
    [A, "a"],
    [B, "b"],
  ] as const) {
    await seed("workout_templates", {
      org_id: ctx.orgId,
      id: `bi_tpl_${s}`,
      name: "Grundtur",
      sport: "bike",
      structure: { kind: "bike", steps: [] },
    });
    await seed("training_blocks", {
      org_id: ctx.orgId,
      id: `bi_block_${s}`,
      name: "Uge",
      weeks: 1,
    });
    await seed("training_block_items", {
      org_id: ctx.orgId,
      block_id: `bi_block_${s}`,
      day: 0,
      ...SESSION,
    });
  }
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe("a block's sessions of their own", () => {
  it("are written by a coach without a template", async () => {
    const q = item(A.orgId, { block_id: "bi_block_a", ...SESSION });
    const result = await asApp(app, A, (c) => c.query(q.text, q.values));
    expect(result.rowCount).toBe(1);
  });

  it("must be whole: no template asks for a sport, a title and the steps", async () => {
    const q = item(A.orgId, { block_id: "bi_block_a", sport: "bike", title: "Uden trin" });
    expect(await expectSqlError(asApp(app, A, (c) => c.query(q.text, q.values)))).toBe("23514");
  });

  it("are never written by a rider, with a template or without", async () => {
    for (const values of [SESSION, { template_id: "bi_tpl_a" }]) {
      const q = item(A.orgId, { block_id: "bi_block_a", ...values });
      expect(await expectSqlError(asApp(app, RIDER, (c) => c.query(q.text, q.values)))).toBe(
        "42501",
      );
    }
    const changed = await asApp(app, RIDER, (c) =>
      c.query(`update training_block_items set title = 'x' where block_id = 'bi_block_a'`),
    );
    expect(changed.rowCount).toBe(0);
    const removed = await asApp(app, RIDER, (c) =>
      c.query(`delete from training_block_items where block_id = 'bi_block_a'`),
    );
    expect(removed.rowCount).toBe(0);
  });

  it("are read by the team's rider, as the team's blocks are", async () => {
    const rows = await asApp(app, RIDER, (c) =>
      c.query(`select title from training_block_items where block_id = 'bi_block_a'`),
    );
    expect(rows.rows).toEqual([{ title: "Holdtur" }]);
  });

  it("are not read by a coach of another team", async () => {
    const rows = await asApp(app, B, (c) =>
      c.query(`select 1 from training_block_items where block_id = 'bi_block_a'`),
    );
    expect(rows.rows).toEqual([]);
    const all = await asApp(app, B, (c) => c.query(`select org_id from training_block_items`));
    expect(all.rows.every((r) => r.org_id === B.orgId)).toBe(true);
  });

  it("are not written by a coach of another team into this team's block", async () => {
    for (const orgId of [A.orgId, B.orgId]) {
      const q = item(orgId, { block_id: "bi_block_a", ...SESSION });
      const code = await expectSqlError(asApp(app, B, (c) => c.query(q.text, q.values)));
      expect(["42501", "23503"]).toContain(code);
    }
    const changed = await asApp(app, B, (c) =>
      c.query(`update training_block_items set title = 'x' where block_id = 'bi_block_a'`),
    );
    expect(changed.rowCount).toBe(0);
  });

  it("name a template of their own team only", async () => {
    const q = item(A.orgId, { block_id: "bi_block_a", template_id: "bi_tpl_b" });
    const code = await expectSqlError(asApp(app, A, (c) => c.query(q.text, q.values)));
    expect(["42501", "23503"]).toContain(code);
  });
});
