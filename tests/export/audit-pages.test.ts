import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Pool } from "pg";
import { resetRateLimits } from "@/core/rate-limit";
import { buildOrgExport, readAuditPage, readNewestAudit } from "@/modules/export/service";
import { exportJsonStream } from "@/modules/export/stream";
import { AUDIT_PAGE, AUDIT_SHEET_ROWS } from "@/modules/export/tables";
import { adminPool } from "../helpers/db";
import { drain } from "../helpers/export";
import { seedPerson } from "../helpers/rows";

/**
 * The audit trail leaves in pages (ADR 0084). The JSON export holds every
 * row and is written a page of AUDIT_PAGE rows at a time; the spreadsheet
 * holds the newest AUDIT_SHEET_ROWS. The export route answers three times
 * a workspace an hour, and then sends the person back to the data page.
 */

const session = vi.hoisted(() => ({ ctx: null as { orgId: string; userId: string } | null }));
vi.mock("@/core/auth/guard", () => ({ requireOrgContext: async () => session.ctx }));
const { GET } = await import("@/app/api/export/route");

const CTX = { orgId: "org_audit_pages", userId: "user_audit_pages" };
const ROWS = 12_345;

let admin: Pool;
let trail: number;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, CTX.orgId, CTX.userId, "owner");
  await admin.query(
    `insert into audit_log (org_id, actor_user_id, actor_type, action, entity_type, entity_id, after_data)
     select $1, $2, 'user', 'checkins.update', 'checkins', 'c' || g, jsonb_build_object('n', g)
     from generate_series(1, $3) g`,
    [CTX.orgId, CTX.userId, ROWS],
  );
});

afterAll(async () => {
  await admin.end();
});

beforeEach(async () => {
  resetRateLimits();
  const { rows } = await admin.query(`select count(*)::int as n from audit_log where org_id = $1`, [
    CTX.orgId,
  ]);
  trail = rows[0].n;
});

describe("the audit trail in the export", () => {
  it("is read a page at a time, never more than a page", async () => {
    const page = await readAuditPage(CTX, 0, Number.MAX_SAFE_INTEGER);
    expect(page.rows).toHaveLength(AUDIT_PAGE);
    const next = await readAuditPage(CTX, page.lastId, Number.MAX_SAFE_INTEGER);
    expect(Number(next.rows[0]![0])).toBeGreaterThan(page.lastId);
  });

  it("is all in the JSON, oldest first, sent as one chunk per page", async () => {
    const data = await buildOrgExport(CTX, "json");
    const chunks: Uint8Array[] = [];
    const reader = exportJsonStream(CTX, data).getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    // The tables, a chunk for each page of the trail, and the close.
    expect(chunks).toHaveLength(1 + Math.ceil(trail / AUDIT_PAGE) + 1);
    const json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const rows = json.tables.Revisionsspor as Array<{ id: string }>;
    expect(rows).toHaveLength(trail);
    const ids = rows.map((r) => Number(r.id));
    expect(ids).toEqual([...ids].sort((x, y) => x - y));
    expect(json.tables.Ryttere).toEqual([]);
  });

  it("is the newest rows in the spreadsheet, and says that older ones were left out", async () => {
    const data = await buildOrgExport(CTX);
    const sheet = await readNewestAudit(CTX, data.auditUpTo, AUDIT_SHEET_ROWS);
    expect(sheet.rows).toHaveLength(AUDIT_SHEET_ROWS);
    expect(sheet.complete).toBe(false);
    const ids = sheet.rows.map((row) => Number(row[0]));
    expect(ids.at(-1)).toBe(data.auditUpTo);
    expect(ids).toEqual([...ids].sort((x, y) => x - y));
    const all = await readNewestAudit(CTX, data.auditUpTo, trail + 10);
    expect(all.complete).toBe(true);
    expect(all.rows).toHaveLength(trail);
  });
});

describe("the export route", () => {
  const get = (query = "") => GET(new NextRequest(`http://localhost:3000/api/export${query}`));

  it("answers three times a workspace an hour, the spreadsheet and the JSON together", async () => {
    session.ctx = CTX;
    const xlsx = await get();
    expect(xlsx.status).toBe(200);
    expect(xlsx.headers.get("content-type")).toMatch(/spreadsheetml/);
    expect((await drain(xlsx.body!)).subarray(0, 2).toString()).toBe("PK");
    const json = await get("?format=json");
    expect(JSON.parse((await drain(json.body!)).toString()).kadence.format).toBe(1);
    expect((await get()).status).toBe(200);

    const fourth = await get("?format=json&locale=en");
    expect(fourth.status).toBe(303);
    expect(fourth.headers.get("location")).toMatch(
      /^\/en\/settings\/data\?limited=export&minutes=\d+$/,
    );
    expect(Number(fourth.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("asks for a session", async () => {
    session.ctx = null;
    expect((await get()).status).toBe(401);
  });
});
