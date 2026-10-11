import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { buildOrgExport } from "@/modules/export/service";
import { AUDIT_COLUMNS, EXPORT_TABLES, columnNames } from "@/modules/export/tables";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The export names its columns (ADR 0084). Every column of every exported
 * table is either written out or left out by name, so a column added
 * later is a decision, not an accident — and the heavy ones, an
 * activity's samples and a club's picture, are never even read.
 */

let admin: Pool;
const CTX = { orgId: "org_export_columns", userId: "user_export_columns" };

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, CTX.orgId, CTX.userId, "owner");
  await admin.query(
    insertSql("riders", { id: "rider_ec", org_id: CTX.orgId, name: "R", birth_year: 2009 }),
  );
  await admin.query(
    insertSql("activities", {
      id: "act_ec",
      org_id: CTX.orgId,
      rider_id: "rider_ec",
      started_at: "2026-11-02T08:00:00Z",
      on_date: "2026-11-02",
      sport: "bike",
      moving_seconds: 3600,
      source: "fit",
      streams: { t: [0, 1], w: [100, 200] },
    }),
  );
});

afterAll(async () => {
  await admin.end();
});

async function databaseColumns(table: string): Promise<string[]> {
  const { rows } = await admin.query(
    `select column_name from information_schema.columns
     where table_schema = 'public' and table_name = $1 order by column_name`,
    [table],
  );
  return rows.map((r) => r.column_name);
}

describe("the export's columns", () => {
  it("account for every column of every table, each written out or left out by name", async () => {
    for (const spec of EXPORT_TABLES) {
      const written = columnNames(spec.columns);
      const left = spec.redact ?? [];
      expect(
        written.filter((c) => left.includes(c)),
        spec.table,
      ).toEqual([]);
      expect(new Set(written).size, spec.table).toBe(written.length);
      expect([...written, ...left].sort(), spec.table).toEqual(await databaseColumns(spec.table));
    }
    expect(columnNames(AUDIT_COLUMNS).sort()).toEqual(await databaseColumns("audit_log"));
  });

  it("never read an activity's samples or a club's picture", () => {
    const named = (table: string) =>
      columnNames(EXPORT_TABLES.find((spec) => spec.table === table)!.columns);
    expect(named("activities")).not.toContain("streams");
    expect(named("org_images")).not.toContain("bytes");
  });

  it("write an activity without its samples and with everything else", async () => {
    const data = await buildOrgExport(CTX);
    const sheet = data.sections.find((s) => s.sheet === "Aktiviteter")!;
    expect(sheet.columns).not.toContain("streams");
    expect(sheet.rows).toHaveLength(1);
    const row = Object.fromEntries(sheet.columns.map((c, i) => [c, sheet.rows[0]![i]]));
    expect(row).toMatchObject({ id: "act_ec", rider_id: "rider_ec", moving_seconds: 3600 });
  });

  it("give an empty table its headings", async () => {
    const data = await buildOrgExport(CTX);
    const goals = data.sections.find((s) => s.sheet === "Mål")!;
    expect(goals.rows).toEqual([]);
    expect(goals.columns).toContain("title");
  });
});
