import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { buildOrgExport } from "@/modules/export/service";
import { MEMBERS_SHEET } from "@/modules/export/tables";
import { listMembers } from "@/modules/export/workspace";
import { listGuardians } from "@/modules/team/guardians";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Members read each other's names, never their addresses (docs/adr/0070).
 *
 * The application role has SELECT on `users.id` and `users.name` and on
 * nothing else of the row, so an address is out of reach to any query —
 * a service's or a bug's — except through `team_member_addresses()`,
 * which answers from the context alone. One team: a coach, two riders
 * with accounts, a confirmed parent of the first, a parent whose link the
 * rider has not confirmed yet, a link nobody holds, and a member who is
 * none of these; and a second team with its own coach, to prove the
 * answer stops at the team.
 */

const ORG = "org_addresses";
const OTHER_ORG = "org_addresses_b";
const COACH = { orgId: ORG, userId: "user_addr_coach" };
const R1 = { orgId: ORG, userId: "user_addr_r1" };
const R2 = { orgId: ORG, userId: "user_addr_r2" };
const PARENT = { orgId: ORG, userId: "user_addr_parent" };
const PENDING = { orgId: ORG, userId: "user_addr_pending" };
const OTHER = { orgId: ORG, userId: "user_addr_other" };
const COACH_B = { orgId: OTHER_ORG, userId: "user_addr_coach_b" };

const TEAM = [COACH, R1, R2, PARENT, PENDING, OTHER].map((p) => p.userId).sort();
const address = (userId: string) => `${userId}@example.com`;

let admin: Pool;
let app: Client;

async function seed(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ORG, ...values });
  await admin.query(q.text, q.values);
}

/** `team_member_addresses()` as the caller sees it, by user id. */
const addresses = (ctx: typeof COACH | null) =>
  asApp(app, ctx, (c) =>
    c.query("select user_id, email from team_member_addresses() order by user_id"),
  ).then((r) => r.rows.map((row) => [row.user_id, row.email]));

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner", "Addresses");
  for (const p of [R1, R2, PARENT, PENDING, OTHER])
    await seedPerson(admin, ORG, p.userId, "member");
  await seedPerson(admin, OTHER_ORG, COACH_B.userId, "owner", "Addresses B");

  await seed("riders", { id: "addr_r1", user_id: R1.userId, name: "Rytter 1", birth_year: 2010 });
  await seed("riders", { id: "addr_r2", user_id: R2.userId, name: "Rytter 2", birth_year: 2009 });
  await seed("guardians", {
    id: "addr_g1",
    rider_id: "addr_r1",
    user_id: PARENT.userId,
    name: "Forælder",
    confirmed_at: new Date(),
  });
  await seed("guardians", {
    id: "addr_g_pending",
    rider_id: "addr_r1",
    user_id: PENDING.userId,
    name: "Venter",
  });
  await seed("guardians", { id: "addr_g_nobody", rider_id: "addr_r2", name: "Kun et navn" });
});

afterAll(async () => {
  await app?.end();
  await admin?.end();
});

describe("the users table, as the application role", () => {
  it.each([
    ["a rider", R1],
    ["a parent", PARENT],
    ["a coach", COACH],
  ])("%s reads names and ids, and the whole team's", async (_who, ctx) => {
    const rows = await asApp(app, ctx, (c) => c.query("select id, name from users order by id"));
    expect(rows.rows.map((r) => r.id)).toEqual(TEAM);
    expect(rows.rows.every((r) => typeof r.name === "string" && r.name.length > 0)).toBe(true);
  });

  it.each([
    ["a rider", R1],
    ["a parent", PARENT],
    ["a coach", COACH],
  ])("%s is refused the address column in every shape, their own included", async (_who, ctx) => {
    for (const sql of [
      "select email from users",
      `select email from users where id = '${ctx.userId}'`,
      "select * from users",
      `select id from users where email = '${address(R2.userId)}'`,
      `select id from users where lower(email) like '%example.com'`,
      "select id from users order by email",
      "select email_verified, two_factor_enabled, platform_role, image from users",
    ]) {
      const code = await asApp(app, ctx, (c) => expectSqlError(c.query(sql)));
      expect(code, sql).toBe("42501");
    }
  });

  it("has no other table-shaped way to the column", async () => {
    // No view over users for the application role, and no column grant but
    // the two: a later migration that widens either fails here.
    const grants = await admin.query(
      `select column_name from information_schema.column_privileges
       where grantee = 'kadence_app' and table_schema = 'public' and table_name = 'users'
       order by column_name`,
    );
    expect(grants.rows.map((r) => r.column_name)).toEqual(["id", "name"]);
    const views = await admin.query(
      `select table_name from information_schema.view_table_usage
       where view_schema = 'public' and table_name = 'users'`,
    );
    expect(views.rows).toEqual([]);
  });
});

describe("team_member_addresses()", () => {
  it("answers a coach with the whole team, and only the team", async () => {
    expect(await addresses(COACH)).toEqual(TEAM.map((id) => [id, address(id)]));
  });

  it("answers a rider with their own address and those holding a link to them", async () => {
    expect(await addresses(R1)).toEqual(
      [PENDING.userId, PARENT.userId, R1.userId].sort().map((id) => [id, address(id)]),
    );
    // A link nobody holds yet has no address; the other rider's parents are not theirs.
    expect(await addresses(R2)).toEqual([[R2.userId, address(R2.userId)]]);
  });

  it("answers a parent with their own address alone: not the rider's, not the coach's", async () => {
    expect(await addresses(PARENT)).toEqual([[PARENT.userId, address(PARENT.userId)]]);
    expect(await addresses(PENDING)).toEqual([[PENDING.userId, address(PENDING.userId)]]);
  });

  it("answers a member who is neither with their own alone", async () => {
    expect(await addresses(OTHER)).toEqual([[OTHER.userId, address(OTHER.userId)]]);
  });

  it("answers nothing without a context", async () => {
    expect(await addresses(null)).toEqual([]);
  });

  it("stops at the team: a coach elsewhere, or with the wrong team active, gets no one", async () => {
    expect(await addresses(COACH_B)).toEqual([[COACH_B.userId, address(COACH_B.userId)]]);
    // The coach of A with B active: not a coach there, so their own address only.
    expect(await addresses({ orgId: OTHER_ORG, userId: COACH.userId })).toEqual([
      [COACH.userId, address(COACH.userId)],
    ]);
    // A forged context naming A's coach as B's: B has no such member.
    expect(await addresses({ orgId: ORG, userId: COACH_B.userId })).toEqual([
      [COACH_B.userId, address(COACH_B.userId)],
    ]);
  });

  it("is the application role's to call and nobody else's", async () => {
    const rows = await admin.query(
      `select has_function_privilege('kadence_app', 'team_member_addresses()', 'execute') as app,
              has_function_privilege('kadence_auth', 'team_member_addresses()', 'execute') as auth,
              has_function_privilege('public', 'team_member_addresses()', 'execute') as anyone`,
    );
    expect(rows.rows[0]).toEqual({ app: true, auth: false, anyone: false });
  });
});

describe("the pages that show an address", () => {
  it("the members page: the team with addresses for a coach, themselves for anyone else", async () => {
    const forCoach = await listMembers(COACH);
    expect(forCoach.map((m) => [m.userId, m.email]).sort()).toEqual(
      TEAM.map((id) => [id, address(id)]),
    );
    const forRider = await listMembers(R1);
    expect(forRider.map((m) => [m.userId, m.email])).toEqual([[R1.userId, address(R1.userId)]]);
    const forParent = await listMembers(PARENT);
    expect(forParent.map((m) => [m.userId, m.email])).toEqual([
      [PARENT.userId, address(PARENT.userId)],
    ]);
  });

  it("a rider's guardians carry the account's name and address for the rider and the coach", async () => {
    const forRider = await listGuardians(R1, "addr_r1");
    expect(forRider.map((g) => [g.id, g.accountName, g.accountEmail])).toEqual([
      ["addr_g1", PARENT.userId, address(PARENT.userId)],
      ["addr_g_pending", PENDING.userId, address(PENDING.userId)],
    ]);
    const forCoach = await listGuardians(COACH, "addr_r1");
    expect(forCoach.map((g) => g.accountEmail)).toEqual([
      address(PARENT.userId),
      address(PENDING.userId),
    ]);
  });

  it("a parent reading beside their own link sees the name, not the other's address", async () => {
    // The guardians policy shows a parent their own link only; the join
    // leaves the address there because it is their own.
    const forParent = await listGuardians(PARENT, "addr_r1");
    expect(forParent.map((g) => [g.id, g.accountName, g.accountEmail])).toEqual([
      ["addr_g1", PARENT.userId, address(PARENT.userId)],
    ]);
  });

  it("the export carries the team's addresses for a coach and only their own for a parent", async () => {
    const sheet = async (ctx: typeof COACH) =>
      (await buildOrgExport(ctx)).sections.find((s) => s.sheet === MEMBERS_SHEET)!;
    const coachSheet = await sheet(COACH);
    expect(coachSheet.columns).toEqual(["name", "email", "role", "created_at"]);
    expect(coachSheet.rows.map((r) => r[1]).sort()).toEqual(TEAM.map(address));
    expect((await sheet(PARENT)).rows.map((r) => r[1])).toEqual([address(PARENT.userId)]);
    expect((await sheet(R2)).rows.map((r) => r[1])).toEqual([address(R2.userId)]);
  });
});
