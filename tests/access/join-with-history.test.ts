import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { createInvitation } from "@/core/access/service";
import { personalWorkspaceOf } from "@/core/access/workspaces";
import { auth } from "@/core/auth/auth";
import { registerUserWithOrganization } from "@/core/auth/register";
import { todayInCopenhagen } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { inviteMember } from "@/core/team/service";
import { acceptWithHistory } from "@/modules/team/history-join";
import { attachRiderInvitation, createRider } from "@/modules/team/riders";
import { adminPool } from "../helpers/db";

/**
 * Joining a team from a personal workspace (docs/adr/0081), end to end
 * against the real Better Auth instance: the person accepts the coach's
 * invitation and says yes or no to "Tag din træning med over på holdet?".
 * Yes moves the rows onto the row the coach prepared and deletes the
 * emptied workspace; no leaves two workspaces; a target the coach has
 * already planned for refuses, and the person is on the team all the same.
 */

const OWNER = "user_jwh_owner";
const PASSWORD = "en-meget-lang-kode-123";
const DAY = "2026-11-02";
const YEAR = Number(todayInCopenhagen().slice(0, 4));

let admin: Pool;
let coach: OrgContext;
let coachHeaders: Headers;

function cookieHeaderFrom(responseHeaders: Headers): Headers {
  const cookie = responseHeaders
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  return new Headers({ cookie });
}

async function signIn(email: string): Promise<Headers> {
  const { headers } = await auth.api.signInEmail({
    body: { email, password: PASSWORD },
    returnHeaders: true,
  });
  return cookieHeaderFrom(headers);
}

type Person = {
  userId: string;
  headers: Headers;
  personalOrgId: string;
  personalRiderId: string;
  teamRiderId: string;
  invitationId: string;
};

/** A person alone with a week of training, whom the coach then prepares a row for and invites. */
async function personAlone(name: string, email: string): Promise<Person> {
  const issued = await createInvitation(OWNER, {
    email,
    organizationName: `${name}s træning`,
    personal: { forWhom: "me", birthYear: YEAR - 16, childName: null, childEmail: null },
  });
  const token = new URL(issued.url).searchParams.get("invitation")!;
  const registered = await registerUserWithOrganization(new Headers(), {
    name,
    email,
    password: PASSWORD,
    organizationName: "ignored",
    invitationToken: token,
  });
  expect(registered).toEqual({ ok: true });
  const { rows } = await admin.query(
    `select u.id as user_id, o.id as org_id, r.id as rider_id
       from users u join memberships m on m.user_id = u.id
       join organizations o on o.id = m.organization_id
       join riders r on r.org_id = o.id and r.user_id = u.id
      where u.email = $1`,
    [email],
  );
  const { user_id: userId, org_id: personalOrgId, rider_id: personalRiderId } = rows[0];
  await admin.query(
    `insert into planned_sessions (org_id, rider_id, on_date, sport, title) values ($1, $2, $3, 'bike', 'Pas')`,
    [personalOrgId, personalRiderId, DAY],
  );
  await admin.query(
    `insert into checkins (org_id, rider_id, on_date, energy) values ($1, $2, $3, 4)`,
    [personalOrgId, personalRiderId, DAY],
  );
  await admin.query("update riders set ftp_watts = 240 where id = $1", [personalRiderId]);

  const teamRiderId = (
    await createRider(coach, { name, birthYear: YEAR - 16, sex: null, categoryOverride: null })
  ).id;
  const invited = await inviteMember(coachHeaders, { email, role: "member" });
  if (!invited.ok) throw new Error(invited.error);
  await attachRiderInvitation(coach, teamRiderId, invited.invitation.id);
  return {
    userId,
    headers: await signIn(email),
    personalOrgId,
    personalRiderId,
    teamRiderId,
    invitationId: invited.invitation.id,
  };
}

const orgExists = async (orgId: string) =>
  (await admin.query("select 1 from organizations where id = $1", [orgId])).rowCount === 1;

const rowsOf = async (riderId: string) =>
  (
    await admin.query(
      `select (select count(*)::int from planned_sessions where rider_id = $1) as sessions,
              (select count(*)::int from checkins where rider_id = $1) as checkins`,
      [riderId],
    )
  ).rows[0] as { sessions: number; checkins: number };

beforeAll(async () => {
  admin = adminPool();
  await admin.query(
    `insert into users (id, name, email, platform_role) values ($1, 'Ejer', 'jwh-owner@example.com', 'owner')
     on conflict do nothing`,
    [OWNER],
  );
  await registerUserWithOrganization(new Headers(), {
    name: "Træner",
    email: "jwh-coach@example.com",
    password: PASSWORD,
    organizationName: "Tilslutningsholdet",
  });
  coachHeaders = await signIn("jwh-coach@example.com");
  const org = await admin.query("select id from organizations where name = 'Tilslutningsholdet'");
  const user = await admin.query("select id from users where email = 'jwh-coach@example.com'");
  coach = { orgId: org.rows[0].id, userId: user.rows[0].id };
});

afterAll(async () => {
  // The personal workspaces left behind by "no" and by the refused move
  // would otherwise be counted by the installation overview's test.
  await admin.query(
    `delete from organizations where id in (
       select m.organization_id from memberships m join users u on u.id = m.user_id
       where u.email like 'jwh-%@example.com')`,
  );
  await admin.query("delete from users where email like 'jwh-%@example.com' or id = $1", [OWNER]);
  await admin.end();
});

describe("yes: the training comes along", () => {
  let mads: Person;

  beforeAll(async () => {
    mads = await personAlone("Mads", "jwh-mads@example.com");
  });

  it("moves the rows onto the coach's row and deletes the emptied workspace", async () => {
    const outcome = await acceptWithHistory(mads.headers, {
      invitationId: mads.invitationId,
      userId: mads.userId,
      takeHistory: true,
    });
    expect(outcome).toEqual({ outcome: "moved", oldWorkspaceDeleted: true });
    expect(await rowsOf(mads.teamRiderId)).toEqual({ sessions: 1, checkins: 1 });
    expect(await orgExists(mads.personalOrgId)).toBe(false);
    expect(await personalWorkspaceOf(mads.userId)).toBeNull();
    const row = await admin.query("select user_id, ftp_watts from riders where id = $1", [
      mads.teamRiderId,
    ]);
    expect(row.rows[0]).toEqual({ user_id: mads.userId, ftp_watts: 240 });
  });

  it("leaves the person on the team, with the team open, and nothing else", async () => {
    const memberships = await admin.query(
      "select organization_id from memberships where user_id = $1",
      [mads.userId],
    );
    expect(memberships.rows.map((r) => r.organization_id)).toEqual([coach.orgId]);
    const session = await auth.api.getSession({
      headers: mads.headers,
      query: { disableCookieCache: true },
    });
    expect(session?.session.activeOrganizationId).toBe(coach.orgId);
    const trail = await admin.query(
      `select entity_type from audit_log where org_id = $1 and action = 'rider.history_moved_in' order by 1`,
      [coach.orgId],
    );
    expect(trail.rows.map((r) => r.entity_type)).toEqual(["checkins", "planned_sessions"]);
  });
});

describe("no: the training stays", () => {
  it("accepts as before, and the person has two workspaces", async () => {
    const ida = await personAlone("Ida", "jwh-ida@example.com");
    const outcome = await acceptWithHistory(ida.headers, {
      invitationId: ida.invitationId,
      userId: ida.userId,
      takeHistory: false,
    });
    expect(outcome).toEqual({ outcome: "accepted" });
    expect(await orgExists(ida.personalOrgId)).toBe(true);
    expect(await rowsOf(ida.personalRiderId)).toEqual({ sessions: 1, checkins: 1 });
    expect(await rowsOf(ida.teamRiderId)).toEqual({ sessions: 0, checkins: 0 });
    const memberships = await admin.query(
      "select count(*)::int as n from memberships where user_id = $1",
      [ida.userId],
    );
    expect(memberships.rows[0].n).toBe(2);
  });
});

describe("yes, but the coach has already planned", () => {
  it("joins without the move, says why, and keeps the personal workspace whole", async () => {
    const lars = await personAlone("Lars", "jwh-lars@example.com");
    await admin.query(
      `insert into planned_sessions (org_id, rider_id, on_date, sport, title) values ($1, $2, $3, 'bike', 'Trænerens pas')`,
      [coach.orgId, lars.teamRiderId, DAY],
    );
    const outcome = await acceptWithHistory(lars.headers, {
      invitationId: lars.invitationId,
      userId: lars.userId,
      takeHistory: true,
    });
    expect(outcome).toEqual({ outcome: "historyStayed", reason: "target_has_history" });
    expect(await orgExists(lars.personalOrgId)).toBe(true);
    expect(await rowsOf(lars.personalRiderId)).toEqual({ sessions: 1, checkins: 1 });
    expect(await rowsOf(lars.teamRiderId)).toEqual({ sessions: 1, checkins: 0 });
    const onTeam = await admin.query("select user_id from riders where id = $1", [
      lars.teamRiderId,
    ]);
    expect(onTeam.rows[0].user_id).toBe(lars.userId);
  });

  it("a wrong person is told so before anything else", async () => {
    const outcome = await acceptWithHistory(coachHeaders, {
      invitationId: "no-such-invitation",
      userId: coach.userId,
      takeHistory: true,
    });
    expect(outcome).toEqual({ outcome: "invalid" });
  });
});
