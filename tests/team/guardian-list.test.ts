import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { listTeamGuardians } from "@/modules/team/guardians";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The team's list of parents, for the coach's list of riders: the coach
 * sees every link, a rider only their own parents', and a parent only
 * their own — whatever the service asks, the database answers (ADR 0011).
 */

const ORG = "org_guardian_list";
const COACH = { orgId: ORG, userId: "user_gl_coach" };
const ANNA = { orgId: ORG, userId: "user_gl_anna" };
const BO = { orgId: ORG, userId: "user_gl_bo" };
const MOR = { orgId: ORG, userId: "user_gl_mor" };

let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [ANNA, BO, MOR]) await seedPerson(admin, ORG, p.userId, "member");
  for (const [id, userId] of [
    ["gl_anna", ANNA.userId],
    ["gl_bo", BO.userId],
  ]) {
    const q = insertSql("riders", { org_id: ORG, id, user_id: userId, name: id, birth_year: 2010 });
    await admin.query(q.text, q.values);
  }
  for (const [id, riderId, userId] of [
    ["gl_g_anna", "gl_anna", MOR.userId],
    ["gl_g_bo", "gl_bo", null],
  ]) {
    const q = insertSql("guardians", {
      org_id: ORG,
      id,
      rider_id: riderId,
      user_id: userId,
      name: id,
    });
    await admin.query(q.text, q.values);
  }
});

afterAll(async () => {
  await admin.end();
});

describe("the team's parents", () => {
  it("are all listed for a coach", async () => {
    const rows = await listTeamGuardians(COACH);
    expect(rows.map((r) => r.id).sort()).toEqual(["gl_g_anna", "gl_g_bo"]);
  });

  it("are only the rider's own for a rider", async () => {
    expect((await listTeamGuardians(ANNA)).map((r) => r.id)).toEqual(["gl_g_anna"]);
    expect((await listTeamGuardians(BO)).map((r) => r.id)).toEqual(["gl_g_bo"]);
  });

  it("are only their own link for a parent, confirmed or not", async () => {
    expect((await listTeamGuardians(MOR)).map((r) => r.id)).toEqual(["gl_g_anna"]);
  });
});
