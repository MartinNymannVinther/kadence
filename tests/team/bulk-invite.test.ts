import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { auth } from "@/core/auth/auth";
import { registerUserWithOrganization } from "@/core/auth/register";
import type { OrgContext } from "@/core/db/tenant";
import { registerInvited } from "@/core/team/register";
import { inviteMember } from "@/core/team/service";
import { whoAmI } from "@/modules/team/access";
import { bulkInvite, type BulkOutcome } from "@/modules/team/bulk-invite";
import { adminPool } from "../helpers/db";

/**
 * "Inviter hele holdet" against the real Better Auth instance (docs/adr/
 * 0064): a coach's list becomes riders, parents and links through the
 * same functions as one at a time; a rider or a parent cannot; a list
 * with a problem, or a failure halfway, leaves nothing behind; another
 * team is untouched.
 */

const PASSWORD = "en-meget-lang-kode-123";
let admin: Pool;
let coach: OrgContext;
let coachHeaders: Headers;
let otherOrgId: string;

function cookies(responseHeaders: Headers): Headers {
  const cookie = responseHeaders
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  return new Headers({ cookie });
}

async function registerCoach(
  email: string,
  team: string,
): Promise<{ ctx: OrgContext; headers: Headers }> {
  await registerUserWithOrganization(new Headers(), {
    name: "Træner",
    email,
    password: PASSWORD,
    organizationName: team,
  });
  const { headers } = await auth.api.signInEmail({
    body: { email, password: PASSWORD },
    returnHeaders: true,
  });
  const org = await admin.query("select id from organizations where name = $1", [team]);
  const user = await admin.query("select id from users where email = $1", [email]);
  return { ctx: { orgId: org.rows[0].id, userId: user.rows[0].id }, headers: cookies(headers) };
}

/** What a team holds: its riders, its parents and its links, pending or not. */
async function snapshot(orgId: string) {
  const [riders, guardians, invitations] = await Promise.all([
    admin.query("select name, invitation_id from riders where org_id = $1 order by name", [orgId]),
    admin.query("select name, invitation_id from guardians where org_id = $1 order by name", [
      orgId,
    ]),
    admin.query(
      "select email, status from invitations where organization_id = $1 order by email, status",
      [orgId],
    ),
  ]);
  return { riders: riders.rows, guardians: guardians.rows, invitations: invitations.rows };
}

function created(outcome: BulkOutcome) {
  if (!outcome.done) throw new Error(JSON.stringify(outcome));
  return outcome.lines;
}

beforeAll(async () => {
  admin = adminPool();
  const first = await registerCoach("bulk-coach@example.com", "Massehold U17");
  coach = first.ctx;
  coachHeaders = first.headers;
  const other = await registerCoach("bulk-other@example.com", "Nabohold U19");
  otherOrgId = other.ctx.orgId;
  await bulkInvite(other.ctx, other.headers, {
    text: "Nabo Rytter, 2009, nabo@example.com; Nabo Mor, nabomor@example.com",
    sharedYear: null,
  });
});

afterAll(async () => {
  await admin.end();
});

describe("a coach invites the whole team", () => {
  let before: Awaited<ReturnType<typeof snapshot>>;

  it("creates the riders, their parents and a link for every address", async () => {
    before = await snapshot(otherOrgId);
    const lines = created(
      await bulkInvite(coach, coachHeaders, {
        text: [
          "Emma Holm, bulk-emma@example.com; Anne Holm, bulk-anne@example.com; Peter Holm",
          "Ida Holm, 2012; Anne Holm, bulk-anne@example.com",
          "",
          "Oskar Lund",
        ].join("\n"),
        sharedYear: 2010,
      }),
    );
    expect(
      lines.map((l) => [l.rider.name, l.rider.birthYear, l.rider.link?.email ?? null]),
    ).toEqual([
      ["Emma Holm", 2010, "bulk-emma@example.com"],
      ["Ida Holm", 2012, null],
      ["Oskar Lund", 2010, null],
    ]);
    expect(lines[0]?.rider.link?.url).toMatch(/^http:\/\/localhost:3000\/join\//);
    // The sisters' mother gets one link, carried by both her rows.
    const anne = lines.flatMap((l) => l.parents).filter((p) => p.name === "Anne Holm");
    expect(anne).toHaveLength(2);
    expect(anne[0]?.link?.id).toBe(anne[1]?.link?.id);
    expect(lines[0]?.parents[1]).toMatchObject({ name: "Peter Holm", link: null });

    const team = await snapshot(coach.orgId);
    expect(team.riders.map((r) => r.name)).toEqual(["Emma Holm", "Ida Holm", "Oskar Lund"]);
    expect(team.riders[0].invitation_id).toBe(lines[0]?.rider.link?.id);
    expect(team.guardians.map((g) => g.name)).toEqual(["Anne Holm", "Anne Holm", "Peter Holm"]);
    expect(team.invitations).toEqual([
      { email: "bulk-anne@example.com", status: "pending" },
      { email: "bulk-emma@example.com", status: "pending" },
    ]);
  });

  it("leaves another team as it was", async () => {
    expect(await snapshot(otherOrgId)).toEqual(before);
    expect(before.riders.map((r) => r.name)).toEqual(["Nabo Rytter"]);
  });

  it("links a shared parent to both children when she joins", async () => {
    const [anneLink] = (await snapshot(coach.orgId)).guardians.map((g) => g.invitation_id);
    const joined = await registerInvited(new Headers(), {
      invitationId: anneLink,
      name: "Anne Holm",
      password: PASSWORD,
    });
    expect(joined.ok).toBe(true);
    const user = await admin.query("select id from users where email = 'bulk-anne@example.com'");
    const me = await whoAmI(coach.orgId, user.rows[0].id);
    expect(me?.children).toHaveLength(2);
  });
});

describe("only a coach", () => {
  it("refuses a rider and a parent, and creates nothing", async () => {
    const emma = (await snapshot(coach.orgId)).riders.find((r) => r.name === "Emma Holm");
    const joined = await registerInvited(new Headers(), {
      invitationId: emma.invitation_id,
      name: "Emma Holm",
      password: PASSWORD,
    });
    if (!joined.ok || !joined.sessionHeaders) throw new Error("Emma could not join");
    const rider = (await admin.query("select id from users where email = 'bulk-emma@example.com'"))
      .rows[0].id;
    const parent = (await admin.query("select id from users where email = 'bulk-anne@example.com'"))
      .rows[0].id;
    const { headers: parentHeaders } = await auth.api.signInEmail({
      body: { email: "bulk-anne@example.com", password: PASSWORD },
      returnHeaders: true,
    });

    const before = await snapshot(coach.orgId);
    const list = { text: "Ny Rytter, 2010, ny-rytter@example.com", sharedYear: null };
    await expect(
      bulkInvite({ orgId: coach.orgId, userId: rider }, joined.sessionHeaders, list),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      bulkInvite({ orgId: coach.orgId, userId: parent }, cookies(parentHeaders), list),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(await snapshot(coach.orgId)).toEqual(before);
  });
});

describe("nothing half made", () => {
  it("refuses a list with a line it cannot read", async () => {
    const before = await snapshot(coach.orgId);
    const outcome = await bulkInvite(coach, coachHeaders, {
      text: "Karl Ny, 2010, karl@example.com\nLise Ny",
      sharedYear: null,
    });
    expect(outcome).toEqual({
      done: false,
      problems: [{ line: 2, code: "noYear" }],
      listProblem: null,
    });
    expect(await snapshot(coach.orgId)).toEqual(before);
  });

  it("refuses a rider already on the team and an address already in use", async () => {
    await inviteMember(coachHeaders, { email: "bulk-waiting@example.com", role: "member" });
    const before = await snapshot(coach.orgId);
    const outcome = await bulkInvite(coach, coachHeaders, {
      text: [
        "Karl Ny, 2010, karl@example.com",
        "oskar lund, 2010",
        "Mads Berg, 2011, bulk-emma@example.com",
        "Sofie Berg, 2011; Far Berg, bulk-waiting@example.com",
      ].join("\n"),
      sharedYear: null,
    });
    expect(outcome).toEqual({
      done: false,
      problems: [
        { line: 2, code: "onTeam", value: "oskar lund" },
        { line: 3, code: "emailMember", value: "bulk-emma@example.com" },
        { line: 4, code: "emailInvited", value: "bulk-waiting@example.com" },
      ],
      listProblem: null,
    });
    expect(await snapshot(coach.orgId)).toEqual(before);
  });

  it("undoes the rows and cancels the links when a row cannot be created", async () => {
    await admin.query(`
      create or replace function test_refuse_row() returns trigger language plpgsql as $$
      begin raise exception 'refused for the test'; end $$;
      create trigger test_refuse_guardian before insert on guardians
        for each row when (new.name = 'Fejl Forælder') execute function test_refuse_row();
    `);
    try {
      const before = await snapshot(coach.orgId);
      await expect(
        bulkInvite(coach, coachHeaders, {
          text: [
            "Karl Ny, 2010, karl-row@example.com; Mor Ny, mor-row@example.com",
            "Lise Ny, 2011; Fejl Forælder",
          ].join("\n"),
          sharedYear: null,
        }),
      ).rejects.toThrow();
      const after = await snapshot(coach.orgId);
      expect(after.riders).toEqual(before.riders);
      expect(after.guardians).toEqual(before.guardians);
      expect(after.invitations.filter((i) => i.email.endsWith("-row@example.com"))).toEqual([
        { email: "karl-row@example.com", status: "canceled" },
        { email: "mor-row@example.com", status: "canceled" },
      ]);
    } finally {
      await admin.query("drop trigger test_refuse_guardian on guardians");
    }
  });

  it("cancels the links already made when one cannot be made", async () => {
    await admin.query(`
      create trigger test_refuse_invitation before insert on invitations
        for each row when (new.email = 'fejl-link@example.com') execute function test_refuse_row();
    `);
    try {
      const before = await snapshot(coach.orgId);
      await expect(
        bulkInvite(coach, coachHeaders, {
          text: "Karl Ny, 2010, karl-link@example.com\nLise Ny, 2011, fejl-link@example.com",
          sharedYear: null,
        }),
      ).rejects.toThrow();
      const after = await snapshot(coach.orgId);
      expect(after.riders).toEqual(before.riders);
      expect(after.guardians).toEqual(before.guardians);
      expect(after.invitations.filter((i) => i.email.endsWith("-link@example.com"))).toEqual([
        { email: "karl-link@example.com", status: "canceled" },
      ]);
    } finally {
      await admin.query("drop trigger test_refuse_invitation on invitations");
      await admin.query("drop function test_refuse_row()");
    }
  });
});
