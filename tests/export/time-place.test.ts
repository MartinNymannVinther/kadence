import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { buildOrgExport } from "@/modules/export/service";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Dogma three for the newest columns: a session's time and place
 * (ADR 0057) and a block's own sessions (ADR 0058) leave with the rest of
 * the team's data. The export reads every column of the tables it lists,
 * so this proves the columns are there and carry what was written.
 */

const ORG = "org_export_timeplace";
const COACH = { orgId: ORG, userId: "user_export_tp_coach" };

let admin: Pool;

async function insert(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ORG, ...values });
  await admin.query(q.text, q.values);
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await insert("riders", { id: "etp_ida", name: "Ida", birth_year: 2010 });
  await insert("planned_sessions", {
    rider_id: "etp_ida",
    on_date: "2026-11-03",
    sport: "bike",
    title: "Holdtur",
    start_time: "17:30",
    meeting_place: "Klubhuset",
  });
  await insert("training_blocks", { id: "etp_block", name: "Uge 45", weeks: 1 });
  await insert("training_block_items", {
    block_id: "etp_block",
    day: 1,
    sport: "bike",
    title: "Holdtur",
    structure: { kind: "bike", steps: [] },
    planned_minutes: 90,
    start_time: "17:30",
    meeting_place: "Klubhuset",
  });
});

afterAll(async () => {
  await admin.end();
});

describe("the export", () => {
  it("carries a session's time and place", async () => {
    const data = await buildOrgExport(COACH);
    const sheet = data.sections.find((s) => s.sheet === "Pas")!;
    const row = sheet.rows[0]!;
    expect(row[sheet.columns.indexOf("start_time")]).toBe("17:30:00");
    expect(row[sheet.columns.indexOf("meeting_place")]).toBe("Klubhuset");
  });

  it("carries a block's own session, steps, time and place included", async () => {
    const data = await buildOrgExport(COACH);
    const sheet = data.sections.find((s) => s.sheet === "Blokkens pas")!;
    const row = sheet.rows[0]!;
    const cell = (column: string) => row[sheet.columns.indexOf(column)];
    expect(cell("template_id")).toBeNull();
    expect(cell("title")).toBe("Holdtur");
    expect(cell("structure")).toEqual({ kind: "bike", steps: [] });
    expect(cell("planned_minutes")).toBe(90);
    expect(cell("start_time")).toBe("17:30:00");
    expect(cell("meeting_place")).toBe("Klubhuset");
  });
});
