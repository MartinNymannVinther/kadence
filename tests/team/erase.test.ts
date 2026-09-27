import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { sql } from "drizzle-orm";
import { withOrgContext } from "@/core/db/tenant";
import { eraseRider } from "@/modules/team/riders";
import { saveCheckin } from "@/modules/wellbeing/checkins";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A rider's right to erasure: the rider and everything about them go, and
 * so do the audit trail's copies — the check-ins' before and after images
 * included — while one row records that an erasure happened, naming no
 * one. Only a coach may, and only for a rider of their own team.
 */

const ORG = "org_erase";
const COACH = { orgId: ORG, userId: "user_erase_coach" };
const RIDER = { orgId: ORG, userId: "user_erase_rider" };
const OTHER = { orgId: "org_erase_other", userId: "user_erase_other" };

let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, ORG, RIDER.userId, "member");
  await seedPerson(admin, OTHER.orgId, OTHER.userId, "owner");
  for (const id of ["er_gone", "er_stays"]) {
    const r = insertSql("riders", {
      org_id: ORG,
      id,
      user_id: id === "er_gone" ? RIDER.userId : null,
      name: id,
      birth_year: 2009,
    });
    await admin.query(r.text, r.values);
  }
  const base = {
    onDate: "2026-11-02",
    sleepHours: 8,
    sleepQuality: 4,
    energy: 4,
    mood: 4,
    soreness: 4,
    stress: 4,
    pain: 0,
    painWhere: "",
    ill: 0,
    note: "privat",
  };
  await saveCheckin(RIDER, { ...base, riderId: "er_gone" });
  await saveCheckin(COACH, { ...base, riderId: "er_stays" });
});

afterAll(async () => {
  await admin.end();
});

const trail = async (riderId: string) =>
  (
    await admin.query(
      `select count(*)::int as n from audit_log
       where (entity_type = 'riders' and entity_id = $1)
          or before_data ->> 'rider_id' = $1 or after_data ->> 'rider_id' = $1`,
      [riderId],
    )
  ).rows[0].n as number;

describe("erasing a rider", () => {
  it("refuses the rider, and a coach of another team", async () => {
    await expect(eraseRider(RIDER, "er_gone")).rejects.toMatchObject({ code: "forbidden" });
    await expect(eraseRider(OTHER, "er_gone")).rejects.toMatchObject({ code: "notFound" });
    const direct = withOrgContext(OTHER, (tx) => tx.execute(sql`select erase_rider(${"er_gone"})`));
    // Called directly, bypassing the service: the function refuses by itself.
    const error = await direct.then(
      () => null,
      (e: { cause?: { message?: string } }) => e,
    );
    expect(error?.cause?.message).toMatch(/not a rider of the active team/);
  });

  it("removes the rider, their data and the trail about them, and nothing else", async () => {
    expect(await trail("er_gone")).toBeGreaterThan(0);
    await eraseRider(COACH, "er_gone");
    const left = await admin.query(
      `select (select count(*)::int from riders where id = 'er_gone') as riders,
              (select count(*)::int from checkins where rider_id = 'er_gone') as checkins`,
    );
    expect(left.rows[0]).toEqual({ riders: 0, checkins: 0 });
    expect(await trail("er_gone")).toBe(0);
    expect(await trail("er_stays")).toBeGreaterThan(0);
    const marker = await admin.query(
      `select count(*)::int as n from audit_log where org_id = $1 and action = 'rider.erased' and entity_id is null`,
      [ORG],
    );
    expect(marker.rows[0].n).toBe(1);
  });
});
