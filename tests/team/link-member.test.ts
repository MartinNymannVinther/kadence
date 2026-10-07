import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { auth } from "@/core/auth/auth";
import { registerUserWithOrganization } from "@/core/auth/register";
import type { OrgContext } from "@/core/db/tenant";
import { registerInvited } from "@/core/team/register";
import { whoAmI } from "@/modules/team/access";
import { bulkInvite, type BulkOutcome } from "@/modules/team/bulk-invite";
import { confirmGuardian } from "@/modules/team/guardians";
import { linkMemberAsGuardian, listLinkableMembers } from "@/modules/team/member-guardians";
import { getRider } from "@/modules/team/riders";
import { adminPool } from "../helpers/db";

/**
 * A parent already on the team, linked to one more child (docs/backlog.md
 * P2-16, ADR 0064 amended): from the rider's page, where the coach picks
 * the member, and in "Inviter hele holdet", where a parent's address that
 * is already a member's is linked instead of refused. No invitation is
 * made, and the parent sees the new child only once that child has said
 * yes — the other child stays as it was.
 */

const PASSWORD = "en-meget-lang-kode-123";
let admin: Pool;
let coach: OrgContext;
let coachHeaders: Headers;
let anne: OrgContext;
let ida: OrgContext;
const riderIds: Record<string, string> = {};

function created(outcome: BulkOutcome) {
  if (!outcome.done) throw new Error(JSON.stringify(outcome));
  return outcome.lines;
}

async function userId(email: string): Promise<string> {
  return (await admin.query("select id from users where email = $1", [email])).rows[0].id;
}

/** Joins through the link the coach made for this address, and claims the row it carries. */
async function join(email: string, name: string): Promise<OrgContext> {
  const invitation = await admin.query(
    "select id from invitations where email = $1 and status = 'pending'",
    [email],
  );
  const joined = await registerInvited(new Headers(), {
    invitationId: invitation.rows[0].id,
    name,
    password: PASSWORD,
  });
  if (!joined.ok) throw new Error(`${name} could not join`);
  const ctx = { orgId: coach.orgId, userId: await userId(email) };
  await whoAmI(ctx.orgId, ctx.userId);
  return ctx;
}

beforeAll(async () => {
  admin = adminPool();
  await registerUserWithOrganization(new Headers(), {
    name: "Træner",
    email: "link-coach@example.com",
    password: PASSWORD,
    organizationName: "Søskendeholdet",
  });
  const { headers } = await auth.api.signInEmail({
    body: { email: "link-coach@example.com", password: PASSWORD },
    returnHeaders: true,
  });
  coachHeaders = new Headers({
    cookie: headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  });
  const org = await admin.query("select id from organizations where name = 'Søskendeholdet'");
  coach = { orgId: org.rows[0].id, userId: await userId("link-coach@example.com") };

  const lines = created(
    await bulkInvite(coach, coachHeaders, {
      text: [
        "Emma Holm, 2010, link-emma@example.com; Anne Holm, link-anne@example.com",
        "Ida Holm, 2012, link-ida@example.com",
      ].join("\n"),
      sharedYear: null,
    }),
  );
  for (const line of lines) riderIds[line.rider.name] = line.rider.id;
  anne = await join("link-anne@example.com", "Anne Holm");
  const emma = await join("link-emma@example.com", "Emma Holm");
  ida = await join("link-ida@example.com", "Ida Holm");
  const [anneForEmma] = (
    await admin.query("select id from guardians where rider_id = $1", [riderIds["Emma Holm"]])
  ).rows;
  await confirmGuardian(emma, anneForEmma.id);
});

afterAll(async () => {
  await admin.end();
});

describe("a coach links a parent already on the team", () => {
  it("lists the team's members with what they are, never the rider or a parent already linked", async () => {
    const forIda = await listLinkableMembers(coach, riderIds["Ida Holm"]!);
    expect(forIda.map((m) => m.userId)).not.toContain(ida.userId);
    expect(forIda.find((m) => m.userId === anne.userId)).toMatchObject({
      name: "Anne Holm",
      parentOf: ["Emma Holm"],
      isCoach: false,
      isRider: false,
    });
    expect(forIda.find((m) => m.userId === coach.userId)).toMatchObject({ isCoach: true });
    const forEmma = await listLinkableMembers(coach, riderIds["Emma Holm"]!);
    expect(forEmma.map((m) => m.userId)).not.toContain(anne.userId);
    await expect(listLinkableMembers(anne, riderIds["Ida Holm"]!)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("links her to Ida with no invitation, and she sees Ida only once Ida says yes", async () => {
    const invitationsBefore = await admin.query(
      "select count(*)::int as n from invitations where email = 'link-anne@example.com'",
    );
    const { id } = await linkMemberAsGuardian(coach, {
      riderId: riderIds["Ida Holm"]!,
      userId: anne.userId,
      relation: "mother",
    });
    const row = await admin.query(
      "select user_id, invitation_id, confirmed_at, name from guardians where id = $1",
      [id],
    );
    expect(row.rows[0]).toMatchObject({
      user_id: anne.userId,
      invitation_id: null,
      confirmed_at: null,
      name: "Anne Holm",
    });
    const invitationsAfter = await admin.query(
      "select count(*)::int as n from invitations where email = 'link-anne@example.com'",
    );
    expect(invitationsAfter.rows[0].n).toBe(invitationsBefore.rows[0].n);

    const waiting = await whoAmI(anne.orgId, anne.userId);
    expect(new Map(waiting?.children.map((c) => [c.riderId, c.confirmed]))).toEqual(
      new Map([
        [riderIds["Emma Holm"], true],
        [riderIds["Ida Holm"], false],
      ]),
    );
    expect(await getRider(anne, riderIds["Ida Holm"]!)).toBeNull();
    expect(await getRider(anne, riderIds["Emma Holm"]!)).not.toBeNull();

    await confirmGuardian(ida, id);
    expect((await getRider(anne, riderIds["Ida Holm"]!))?.name).toBe("Ida Holm");
  });

  it("refuses the same parent twice, the rider as their own parent, and somebody not on the team", async () => {
    const twice = linkMemberAsGuardian(coach, {
      riderId: riderIds["Ida Holm"]!,
      userId: anne.userId,
      relation: "mother",
    });
    await expect(twice).rejects.toMatchObject({ code: "conflict", detail: "alreadyParent" });
    const self = linkMemberAsGuardian(coach, {
      riderId: riderIds["Ida Holm"]!,
      userId: ida.userId,
      relation: "other",
    });
    await expect(self).rejects.toMatchObject({ code: "conflict", detail: "parentIsRider" });
    await admin.query(
      `insert into users (id, name, email) values ('user_link_stranger', 'Fremmed', 'link-stranger@example.com')
       on conflict do nothing`,
    );
    const stranger = linkMemberAsGuardian(coach, {
      riderId: riderIds["Emma Holm"]!,
      userId: "user_link_stranger",
      relation: "other",
    });
    await expect(stranger).rejects.toMatchObject({ code: "notFound" });
  });

  it("is a coach's to do, not a parent's or a rider's", async () => {
    for (const who of [anne, ida]) {
      const attempt = linkMemberAsGuardian(who, {
        riderId: riderIds["Emma Holm"]!,
        userId: coach.userId,
        relation: "other",
      });
      await expect(attempt).rejects.toMatchObject({ code: "forbidden" });
    }
  });
});

describe("Inviter hele holdet with a parent already on the team", () => {
  it("links her account instead of refusing her address, and still refuses it for a rider", async () => {
    const lines = created(
      await bulkInvite(coach, coachHeaders, {
        text: "Noah Holm, 2013; Anne Holm, link-anne@example.com",
        sharedYear: null,
      }),
    );
    expect(lines[0]?.parents).toMatchObject([{ name: "Anne Holm", link: null, linked: true }]);
    const row = await admin.query(
      "select user_id, invitation_id, confirmed_at from guardians where rider_id = $1",
      [lines[0]?.rider.id],
    );
    expect(row.rows).toEqual([{ user_id: anne.userId, invitation_id: null, confirmed_at: null }]);
    const pending = await admin.query(
      "select count(*)::int as n from invitations where email = 'link-anne@example.com' and status = 'pending'",
    );
    expect(pending.rows[0].n).toBe(0);

    const refused = await bulkInvite(coach, coachHeaders, {
      text: "Mads Holm, 2013, link-anne@example.com",
      sharedYear: null,
    });
    expect(refused).toEqual({
      done: false,
      problems: [{ line: 1, code: "emailMember", value: "link-anne@example.com" }],
      listProblem: null,
    });
  });
});
