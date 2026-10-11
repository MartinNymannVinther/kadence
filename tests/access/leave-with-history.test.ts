import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { canCreatePersonalWorkspace, personalWorkspaceOf } from "@/core/access/workspaces";
import { auth } from "@/core/auth/auth";
import { createPersonalWorkspaceFor } from "@/core/auth/personal-workspace";
import { registerUserWithOrganization } from "@/core/auth/register";
import type { OrgContext } from "@/core/db/tenant";
import { registerInvited } from "@/core/team/register";
import { inviteMember } from "@/core/team/service";
import { claimPendingLinks } from "@/modules/team/claim";
import { leaveWithHistory } from "@/modules/team/history-leave";
import { attachRiderInvitation, createRider } from "@/modules/team/riders";
import { adminPool } from "../helpers/db";

/**
 * Leaving a team with the training (docs/adr/0081), end to end against
 * the real Better Auth instance: a rider says yes, gets a personal
 * workspace made by the server, their rows move there, and only then do
 * they leave. A person owns one such workspace and no request can make
 * one; a move that fails half way leaves the person where they were.
 */

const PASSWORD = "en-meget-lang-kode-123";
const DAY = "2026-11-02";
let admin: Pool;
let coach: OrgContext;
let coachHeaders: Headers;
const riders = {} as Record<
  "emma" | "noah" | "sofie",
  { ctx: OrgContext; headers: Headers; riderId: string }
>;

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

/** A rider the coach prepared and invited, joined through the link, with a week of training. */
async function joinedRider(name: string, email: string) {
  const riderId = (
    await createRider(coach, { name, birthYear: 2010, sex: null, categoryOverride: null })
  ).id;
  const invited = await inviteMember(coachHeaders, { email, role: "member" });
  if (!invited.ok) throw new Error(invited.error);
  await attachRiderInvitation(coach, riderId, invited.invitation.id);
  const result = await registerInvited(new Headers(), {
    invitationId: invited.invitation.id,
    name,
    password: PASSWORD,
  });
  if (!result.ok || !result.sessionHeaders) throw new Error(`${email} could not join`);
  const ctx = { orgId: coach.orgId, userId: await userId(email) };
  // The first page a member opens claims the row the coach prepared
  // (src/modules/team/access.ts); here it is done by hand.
  expect(await claimPendingLinks(ctx)).toBe(1);
  await admin.query(
    `insert into planned_sessions (org_id, rider_id, on_date, sport, title) values ($1, $2, $3, 'bike', 'Pas')`,
    [coach.orgId, riderId, DAY],
  );
  await admin.query(
    `insert into checkins (org_id, rider_id, on_date, energy) values ($1, $2, $3, 3)`,
    [coach.orgId, riderId, DAY],
  );
  return { ctx, headers: result.sessionHeaders, riderId };
}

const member = async (ctx: OrgContext) =>
  (
    await admin.query("select 1 from memberships where organization_id = $1 and user_id = $2", [
      ctx.orgId,
      ctx.userId,
    ])
  ).rowCount === 1;

const workspacesOf = async (user: string) =>
  Number(
    (await admin.query("select count(*)::int as n from memberships where user_id = $1", [user]))
      .rows[0].n,
  );

beforeAll(async () => {
  admin = adminPool();
  await registerUserWithOrganization(new Headers(), {
    name: "Træner",
    email: "lwh-coach@example.com",
    password: PASSWORD,
    organizationName: "Historikholdet",
  });
  const { headers } = await auth.api.signInEmail({
    body: { email: "lwh-coach@example.com", password: PASSWORD },
    returnHeaders: true,
  });
  coachHeaders = cookieHeaderFrom(headers);
  const org = await admin.query("select id from organizations where name = 'Historikholdet'");
  coach = { orgId: org.rows[0].id, userId: await userId("lwh-coach@example.com") };
  riders.emma = await joinedRider("Emma Holm", "lwh-emma@example.com");
  riders.noah = await joinedRider("Noah Lund", "lwh-noah@example.com");
  riders.sofie = await joinedRider("Sofie Kjær", "lwh-sofie@example.com");
});

afterAll(async () => {
  // The personal workspaces made here would otherwise be counted by the
  // installation overview's test, which shares the database.
  await admin.query(
    `delete from organizations where id in (
       select m.organization_id from memberships m join users u on u.id = m.user_id
       where u.email like 'lwh-%@example.com')`,
  );
  await admin.query("delete from users where email like 'lwh-%@example.com'");
  await admin.end();
});

describe("a rider leaves with the training", () => {
  let newOrgId: string;

  it("gets a personal workspace of their own, with the rows, and is off the team", async () => {
    const { ctx, headers, riderId } = riders.emma;
    const outcome = await leaveWithHistory(headers, ctx, { workspaceName: "Emmas træning" });
    expect(outcome.outcome).toBe("left");
    if (outcome.outcome !== "left") return;
    newOrgId = outcome.orgId;

    const org = await admin.query("select kind, name from organizations where id = $1", [newOrgId]);
    expect(org.rows[0]).toEqual({ kind: "personal", name: "Emmas træning" });
    const role = await admin.query(
      "select role from memberships where organization_id = $1 and user_id = $2",
      [newOrgId, ctx.userId],
    );
    expect(role.rows[0].role).toBe("owner");
    expect(await member(ctx)).toBe(false);

    const own = await admin.query(
      "select id, name, birth_year, user_id from riders where org_id = $1",
      [newOrgId],
    );
    expect(own.rows).toHaveLength(1);
    expect(own.rows[0]).toMatchObject({ name: "Emma Holm", birth_year: 2010, user_id: ctx.userId });
    const moved = await admin.query(
      `select (select count(*)::int from planned_sessions where rider_id = $1) as sessions,
              (select count(*)::int from checkins where rider_id = $1) as checkins,
              (select count(*)::int from planned_sessions where rider_id = $2) as left_sessions`,
      [own.rows[0].id, riderId],
    );
    expect(moved.rows[0]).toEqual({ sessions: 1, checkins: 1, left_sessions: 0 });
  });

  it("leaves the team one counted line per table, and no copy", async () => {
    const trail = await admin.query(
      `select entity_type, after_data from audit_log
       where org_id = $1 and action = 'rider.history_moved_out' order by entity_type`,
      [coach.orgId],
    );
    expect(trail.rows).toEqual([
      { entity_type: "checkins", after_data: { table: "checkins", rows: 1 } },
      { entity_type: "planned_sessions", after_data: { table: "planned_sessions", rows: 1 } },
    ]);
    const stays = await admin.query("select 1 from riders where id = $1", [riders.emma.riderId]);
    expect(stays.rowCount).toBe(1);
  });

  it("opens the new workspace for the person", async () => {
    const session = await auth.api.getSession({ headers: riders.emma.headers });
    expect(session?.session.activeOrganizationId).toBe(newOrgId);
  });

  it("is the one personal workspace the person may have", async () => {
    const { ctx } = riders.emma;
    expect(await personalWorkspaceOf(ctx.userId)).toEqual({
      orgId: newOrgId,
      name: "Emmas træning",
    });
    expect(await canCreatePersonalWorkspace(ctx.userId)).toBe(false);
    await expect(
      auth.api.createOrganization({
        body: { name: "Endnu et", slug: `endnu-et-${Date.now()}`, userId: ctx.userId },
      }),
    ).rejects.toThrow(/personal workspace/i);
    expect(await createPersonalWorkspaceFor(ctx.userId, "Endnu et")).toBeNull();
    expect(await workspacesOf(ctx.userId)).toBe(1);
  });
});

describe("the server-only path is closed to requests", () => {
  it("a request carrying a user id and no session is refused", async () => {
    await expect(
      auth.api.createOrganization({
        body: { name: "Forsøg", slug: `forsoeg-${Date.now()}`, userId: riders.noah.ctx.userId },
        headers: new Headers({ "x-kadence-personal": "anything" }),
      }),
    ).rejects.toThrow();
    expect(await workspacesOf(riders.noah.ctx.userId)).toBe(1);
  });

  it("a signed-in rider on a team cannot create a workspace, user id or not", async () => {
    await expect(
      auth.api.createOrganization({
        body: { name: "Forsøg", slug: `forsoeg2-${Date.now()}`, userId: riders.noah.ctx.userId },
        headers: riders.noah.headers,
      }),
    ).rejects.toThrow();
    expect(await workspacesOf(riders.noah.ctx.userId)).toBe(1);
  });
});

describe("when the move cannot happen", () => {
  it("a personal workspace that already holds training refuses, and nothing changes", async () => {
    const { ctx, headers } = riders.noah;
    const own = await createPersonalWorkspaceFor(ctx.userId, "Noahs træning");
    expect(own).not.toBeNull();
    const ownCtx = { orgId: own!.orgId, userId: ctx.userId };
    const rider = await createRider(ownCtx, {
      name: "Noah Lund",
      birthYear: 2010,
      sex: null,
      categoryOverride: null,
      userId: ctx.userId,
    });
    await admin.query(
      `insert into checkins (org_id, rider_id, on_date, energy) values ($1, $2, $3, 2)`,
      [own!.orgId, rider.id, DAY],
    );

    expect(await leaveWithHistory(headers, ctx, { workspaceName: "Noahs træning" })).toEqual({
      outcome: "hasHistory",
    });
    expect(await member(ctx)).toBe(true);
    expect(await workspacesOf(ctx.userId)).toBe(2);
    const stayed = await admin.query(
      "select count(*)::int as n from planned_sessions where rider_id = $1",
      [riders.noah.riderId],
    );
    expect(stayed.rows[0].n).toBe(1);
  });

  it("a failure half way deletes the new workspace again and keeps the person on the team", async () => {
    const { ctx, headers, riderId } = riders.sofie;
    // A trigger that fires even under the function's switch, and refuses
    // this rider's check-ins a new home: the move fails after the
    // workspace was made.
    await admin.query(`
      create or replace function lwh_block() returns trigger language plpgsql as $$
      begin
        if new.rider_id is distinct from old.rider_id then raise exception 'lwh: blocked'; end if;
        return new;
      end $$;
      create trigger lwh_block before update on checkins for each row execute function lwh_block();
      alter table checkins enable always trigger lwh_block;`);
    try {
      expect(await leaveWithHistory(headers, ctx, { workspaceName: "Sofies træning" })).toEqual({
        outcome: "failed",
      });
    } finally {
      await admin.query("drop trigger lwh_block on checkins; drop function lwh_block()");
    }
    expect(await member(ctx)).toBe(true);
    expect(await workspacesOf(ctx.userId)).toBe(1);
    expect(await personalWorkspaceOf(ctx.userId)).toBeNull();
    const kept = await admin.query(
      `select (select count(*)::int from planned_sessions where rider_id = $1) as sessions,
              (select count(*)::int from checkins where rider_id = $1) as checkins`,
      [riderId],
    );
    expect(kept.rows[0]).toEqual({ sessions: 1, checkins: 1 });
    const gone = await admin.query(
      "select count(*)::int as n from organizations where name = 'Sofies træning'",
    );
    expect(gone.rows[0].n).toBe(0);
  });
});
