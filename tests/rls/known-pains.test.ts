import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Known pains (drizzle/0057, docs/adr/0097) are health data about one
 * rider, separated in the database as the check-ins are (ADR 0011): the
 * coach reads and writes every rider's; a rider their own and never a
 * teammate's; a parent reads their child's only while the child shares
 * wellbeing, and never writes; another team sees nothing. Every change is
 * in the audit trail.
 */

const ORG = "org_known_pains";
const OTHER_ORG = "org_known_pains_other";
const COACH = { orgId: ORG, userId: "user_kp_coach" };
const R1 = { orgId: ORG, userId: "user_kp_r1" };
const R2 = { orgId: ORG, userId: "user_kp_r2" };
const PARENT = { orgId: ORG, userId: "user_kp_parent" };
const STRANGER = { orgId: OTHER_ORG, userId: "user_kp_stranger" };

let admin: Pool;
let app: Client;

async function seed(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, values);
  await admin.query(q.text, q.values);
}

const places = (ctx: typeof COACH) =>
  asApp(app, ctx, (c) => c.query(`select place from known_pains order by place`)).then((r) =>
    r.rows.map((row) => row.place as string),
  );

const insert = (ctx: typeof COACH, riderId: string, orgId = ORG) =>
  expectSqlError(
    asApp(app, ctx, (c) =>
      c.query(
        `insert into known_pains (org_id, rider_id, place, usual_level) values ($1, $2, 'Hofte', 1)`,
        [orgId, riderId],
      ),
    ),
  );

const update = (ctx: typeof COACH, id: string) =>
  asApp(app, ctx, (c) =>
    c.query(`update known_pains set usual_level = 1 where id = $1`, [id]).then((r) => r.rowCount),
  );

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner", "Kendte smerter");
  for (const p of [R1, R2, PARENT]) await seedPerson(admin, ORG, p.userId, "member");
  await seedPerson(admin, OTHER_ORG, STRANGER.userId, "owner", "Andet hold");
  await seed("riders", {
    id: "kp_r1",
    org_id: ORG,
    user_id: R1.userId,
    name: "R1",
    birth_year: 2010,
  });
  await seed("riders", {
    id: "kp_r2",
    org_id: ORG,
    user_id: R2.userId,
    name: "R2",
    birth_year: 2009,
  });
  await seed("guardians", {
    id: "kp_g1",
    org_id: ORG,
    rider_id: "kp_r1",
    user_id: PARENT.userId,
    name: "Forælder",
    confirmed_at: new Date(),
  });
  await seed("known_pains", {
    id: "kp_back",
    org_id: ORG,
    rider_id: "kp_r1",
    place: "Ryg",
    usual_level: 2,
  });
  await seed("known_pains", {
    id: "kp_knee",
    org_id: ORG,
    rider_id: "kp_r2",
    place: "Knæ",
    usual_level: 1,
  });
});

afterAll(async () => {
  await admin.query("delete from organizations where id = any($1)", [[ORG, OTHER_ORG]]);
  await admin.query("delete from users where id like 'user_kp_%'");
  await app.end();
  await admin.end();
});

describe("known pains between riders and teams", () => {
  it("are every rider's for the coach, and nothing for another team", async () => {
    expect(await places(COACH)).toEqual(["Knæ", "Ryg"]);
    expect(await places(STRANGER)).toEqual([]);
    expect(await update(STRANGER, "kp_back")).toBe(0);
  });

  it("are a rider's own, never a teammate's", async () => {
    expect(await places(R1)).toEqual(["Ryg"]);
    expect(await places(R2)).toEqual(["Knæ"]);
    expect(await update(R2, "kp_back")).toBe(0);
    expect(await update(R1, "kp_back")).toBe(1);
  });

  it("are written by the rider and the coach, for this team's riders only", async () => {
    expect(await insert(R1, "kp_r1")).toBe("NO_ERROR");
    expect(await insert(COACH, "kp_r2")).toBe("NO_ERROR");
    expect(await insert(R1, "kp_r2")).toBe("42501");
    // Another team's org_id, or this team's rider from another team.
    expect(await insert(STRANGER, "kp_r1", ORG)).toBe("42501");
    expect(await insert(STRANGER, "kp_r1", OTHER_ORG)).toBe("42501");
  });

  it("reach a parent only while the child shares wellbeing, and are never theirs to write", async () => {
    await admin.query("update riders set share_wellbeing = false where id = 'kp_r1'");
    expect(await places(PARENT)).toEqual([]);
    await admin.query("update riders set share_wellbeing = true where id = 'kp_r1'");
    expect(await places(PARENT)).toEqual(["Ryg"]);
    expect(await update(PARENT, "kp_back")).toBe(0);
    expect(await insert(PARENT, "kp_r1")).toBe("42501");
    await admin.query("update riders set share_wellbeing = false where id = 'kp_r1'");
  });

  it("are refused a usual level of 3, and a place of more than 40 characters", async () => {
    const bad = (sql: string) => expectSqlError(asApp(app, COACH, (c) => c.query(sql)));
    expect(
      await bad(
        `insert into known_pains (org_id, rider_id, place, usual_level) values ('${ORG}', 'kp_r1', 'Hæl', 3)`,
      ),
    ).toBe("23514");
    expect(
      await bad(
        `insert into known_pains (org_id, rider_id, place, usual_level) values ('${ORG}', 'kp_r1', '${"x".repeat(41)}', 1)`,
      ),
    ).toBe("23514");
  });

  it("are audited", async () => {
    const trail = await admin.query(
      `select count(*)::int as n from audit_log where entity_type = 'known_pains' and entity_id = 'kp_back'`,
    );
    expect(trail.rows[0].n).toBeGreaterThan(0);
  });
});
