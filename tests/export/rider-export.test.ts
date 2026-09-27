import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { buildOrgExport } from "@/modules/export/service";
import { MEMBERS_SHEET } from "@/modules/export/tables";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Dogma three for a rider: the same export, cut by the database to what
 * the rider may see — their own training and check-ins, the team's
 * calendar and library, and in the member list only themselves, never the
 * other young riders' addresses (ADR 0011).
 */

const ORG = "org_rider_export";
const COACH = { orgId: ORG, userId: "user_rexp_coach" };
const ALMA = { orgId: ORG, userId: "user_rexp_alma" };

let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, ORG, ALMA.userId, "member");
  await seedPerson(admin, ORG, "user_rexp_viggo", "member");
  for (const [id, uid] of [
    ["re_alma", ALMA.userId],
    ["re_viggo", "user_rexp_viggo"],
  ]) {
    const r = insertSql("riders", { org_id: ORG, id, user_id: uid, name: id, birth_year: 2009 });
    await admin.query(r.text, r.values);
    const c = insertSql("checkins", {
      org_id: ORG,
      rider_id: id,
      on_date: "2026-11-02",
      energy: 4,
    });
    await admin.query(c.text, c.values);
  }
});

afterAll(async () => {
  await admin.end();
});

describe("a rider's export", () => {
  it("holds the rider's own data and only the rider among the members", async () => {
    const data = await buildOrgExport(ALMA);
    const sheet = (name: string) => data.sections.find((s) => s.sheet === name)!;
    const members = sheet(MEMBERS_SHEET);
    expect(members.rows.map((r) => r[1])).toEqual(["user_rexp_alma@example.com"]);
    const riders = sheet("Ryttere");
    expect(riders.rows.map((r) => r[riders.columns.indexOf("id")])).toEqual(["re_alma"]);
    const checkins = sheet("Check-ins");
    expect(checkins.rows.map((r) => r[checkins.columns.indexOf("rider_id")])).toEqual(["re_alma"]);
    expect(sheet("Revisionsspor").rows).toEqual([]);
  });

  it("gives a coach the whole team", async () => {
    const data = await buildOrgExport(COACH);
    expect(data.sections.find((s) => s.sheet === MEMBERS_SHEET)!.rows).toHaveLength(3);
    expect(data.sections.find((s) => s.sheet === "Check-ins")!.rows).toHaveLength(2);
  });
});
