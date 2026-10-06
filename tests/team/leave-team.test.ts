import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { leavesFromMe, settingsItems } from "@/app/[locale]/(app)/(narrow)/settings/settings-items";
import { auth } from "@/core/auth/auth";
import { registerUserWithOrganization } from "@/core/auth/register";
import type { OrgContext } from "@/core/db/tenant";
import { registerInvited } from "@/core/team/register";
import { inviteMember, leaveWorkspace } from "@/core/team/service";
import { whoAmI } from "@/modules/team/access";
import { addGuardian, attachGuardianInvitation } from "@/modules/team/guardians";
import { attachRiderInvitation, createRider } from "@/modules/team/riders";
import { adminPool } from "../helpers/db";

/**
 * Riders and parents can leave the team again (P1-07). Since ADR 0061 a
 * rider's and a parent's settings have no workspace tab, where "Forlad
 * holdet" stood, so it stands at the bottom of Mig for everybody who is
 * not a coach (`leavesFromMe`), and the coach keeps it on the workspace
 * page. Then the same service as before, for the people who now see it.
 */

const PASSWORD = "en-meget-lang-kode-123";
let admin: Pool;
let coach: OrgContext;
let riderId: string;
const joined = {} as Record<"rider" | "parent", { ctx: OrgContext; headers: Headers }>;

function cookieHeaderFrom(responseHeaders: Headers): Headers {
  const cookie = responseHeaders
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  return new Headers({ cookie });
}

async function userId(email: string): Promise<string> {
  return (await admin.query("select id from users where email = $1", [email])).rows[0].id;
}

async function join(email: string, invitationId: string, name: string) {
  const result = await registerInvited(new Headers(), { invitationId, name, password: PASSWORD });
  if (!result.ok || !result.sessionHeaders) throw new Error(`${email} could not join`);
  return {
    ctx: { orgId: coach.orgId, userId: await userId(email) },
    headers: result.sessionHeaders,
  };
}

beforeAll(async () => {
  admin = adminPool();
  await registerUserWithOrganization(new Headers(), {
    name: "Træner",
    email: "leave-coach@example.com",
    password: PASSWORD,
    organizationName: "Forladeholdet",
  });
  const { headers } = await auth.api.signInEmail({
    body: { email: "leave-coach@example.com", password: PASSWORD },
    returnHeaders: true,
  });
  const coachHeaders = cookieHeaderFrom(headers);
  const org = await admin.query("select id from organizations where name = 'Forladeholdet'");
  coach = { orgId: org.rows[0].id, userId: await userId("leave-coach@example.com") };

  riderId = (
    await createRider(coach, { name: "Emma", birthYear: 2010, sex: null, categoryOverride: null })
  ).id;
  const forRider = await inviteMember(coachHeaders, {
    email: "leave-emma@example.com",
    role: "member",
  });
  if (!forRider.ok) throw new Error(forRider.error);
  await attachRiderInvitation(coach, riderId, forRider.invitation.id);
  joined.rider = await join("leave-emma@example.com", forRider.invitation.id, "Emma");

  const mother = await addGuardian(coach, { riderId, name: "Mor", relation: "mother" });
  const forParent = await inviteMember(coachHeaders, {
    email: "leave-mor@example.com",
    role: "member",
  });
  if (!forParent.ok) throw new Error(forParent.error);
  await attachGuardianInvitation(coach, mother.id, forParent.invitation.id);
  joined.parent = await join("leave-mor@example.com", forParent.invitation.id, "Mor");
});

afterAll(async () => {
  await admin.end();
});

describe("where the way off the team stands", () => {
  const tabs = (who: { isCoach: boolean; isRider: boolean }) =>
    settingsItems({ owner: false, ...who }).map((i) => i.key);

  it("is at the bottom of Mig for whoever has no workspace tab, and only for them", () => {
    for (const who of [
      { isCoach: false, isRider: true },
      { isCoach: false, isRider: false },
    ]) {
      expect(tabs(who)).not.toContain("workspace");
      expect(leavesFromMe(who)).toBe(true);
    }
    expect(tabs({ isCoach: true, isRider: false })).toContain("workspace");
    expect(leavesFromMe({ isCoach: true })).toBe(false);
    expect(leavesFromMe(null)).toBe(false);
  });

  it("shows for a rider and a parent, and not for the coach", async () => {
    const rider = await whoAmI(joined.rider.ctx.orgId, joined.rider.ctx.userId);
    const parent = await whoAmI(joined.parent.ctx.orgId, joined.parent.ctx.userId);
    const theCoach = await whoAmI(coach.orgId, coach.userId);
    expect(rider?.rider?.id).toBe(riderId);
    expect(parent?.children.map((c) => c.riderId)).toEqual([riderId]);
    expect(leavesFromMe(rider)).toBe(true);
    expect(leavesFromMe(parent)).toBe(true);
    expect(leavesFromMe(theCoach)).toBe(false);
  });
});

describe("leaving, as a parent and as a rider", () => {
  async function member(ctx: OrgContext): Promise<boolean> {
    const rows = await admin.query(
      "select 1 from memberships where organization_id = $1 and user_id = $2",
      [ctx.orgId, ctx.userId],
    );
    return rows.rowCount === 1;
  }

  it("takes the parent off the team", async () => {
    expect(await leaveWorkspace(joined.parent.headers, coach.orgId)).toBe(true);
    expect(await member(joined.parent.ctx)).toBe(false);
    expect(await whoAmI(joined.parent.ctx.orgId, joined.parent.ctx.userId)).toBeNull();
  });

  it("takes the rider off the team, and what the rider entered stays with it", async () => {
    expect(await leaveWorkspace(joined.rider.headers, coach.orgId)).toBe(true);
    expect(await member(joined.rider.ctx)).toBe(false);
    const row = await admin.query("select id from riders where id = $1", [riderId]);
    expect(row.rowCount).toBe(1);
  });

  it("leaves the team its owner", async () => {
    const { headers } = await auth.api.signInEmail({
      body: { email: "leave-coach@example.com", password: PASSWORD },
      returnHeaders: true,
    });
    expect(await leaveWorkspace(cookieHeaderFrom(headers), coach.orgId)).toBe(false);
    expect(await member(coach)).toBe(true);
  });
});
