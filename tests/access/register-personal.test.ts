import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { personalSpecOf } from "@/core/access/personal";
import {
  approveAccessRequest,
  createInvitation,
  findValidInvitation,
  renewInvitation,
  submitAccessRequest,
} from "@/core/access/service";
import { hashInvitationToken, newInvitationToken } from "@/core/access/tokens";
import { registerUserWithOrganization } from "@/core/auth/register";
import { todayInCopenhagen } from "@/core/dates";
import { adminPool } from "../helpers/db";

/**
 * A person alone (docs/adr/0080): an application for one person's own
 * training, the owner's approval, and the registration that makes a
 * personal workspace with its rider row. Under 15 a person cannot apply
 * for themselves (databeskyttelsesloven § 6, stk. 2-3, lov nr. 1783 af
 * 28.12.2023); a parent applies
 * for the child, and the child's row waits for the child's own account.
 */

const OWNER = "user_personal_owner";
const META = { ipAddress: null, userAgent: "vitest" };
const PASSWORD = "en-meget-lang-kode-123";
const YEAR = Number(todayInCopenhagen().slice(0, 4));

let admin: Pool;

const tokenOf = (url: string) => new URL(url).searchParams.get("invitation")!;

async function workspaceOf(email: string) {
  const { rows } = await admin.query(
    `select o.id, o.name, o.kind, m.role, u.id as user_id
       from users u join memberships m on m.user_id = u.id
       join organizations o on o.id = m.organization_id
      where u.email = $1`,
    [email],
  );
  return rows[0] as { id: string; name: string; kind: string; role: string; user_id: string };
}

beforeAll(async () => {
  admin = adminPool();
  await admin.query(
    `insert into users (id, name, email, platform_role)
     values ($1, 'Ejer', 'personal-owner@personal.example', 'owner') on conflict do nothing`,
    [OWNER],
  );
});

afterAll(async () => {
  await admin.query(
    "delete from access_invitations where email like '%@personal.example' or email like '%@personal-direct.example'",
  );
  await admin.query("delete from access_requests where email like '%@personal.example'");
  await admin.query(
    `delete from organizations where id in (
       select organization_id from memberships m join users u on u.id = m.user_id
       where u.email like '%@personal.example')`,
  );
  await admin.query("delete from users where email like '%@personal.example'");
  await admin.end();
});

describe("applying for one person", () => {
  it("refuses someone under 15 applying for themselves, and stores nothing", async () => {
    const result = await submitAccessRequest(
      {
        name: "Lille Ung",
        email: "lille@personal.example",
        organizationName: "Lilles træning",
        kind: "personal",
        personal: { forWhom: "me", birthYear: YEAR - 14 },
      },
      META,
    );
    expect(result).toEqual({ ok: false, error: "tooYoung" });
    const { rowCount } = await admin.query(
      "select 1 from access_requests where email = 'lille@personal.example'",
    );
    expect(rowCount).toBe(0);
  });

  it("refuses a personal application without its fields", async () => {
    const result = await submitAccessRequest(
      { name: "X", email: "x@personal.example", organizationName: "X", kind: "personal" },
      META,
    );
    expect(result).toEqual({ ok: false, error: "invalid" });
  });

  it("approval carries the kind and the rider's birth year into the invitation", async () => {
    expect(
      await submitAccessRequest(
        {
          name: "Sofie Ung",
          email: "sofie@personal.example",
          organizationName: "Sofies træning",
          kind: "personal",
          personal: { forWhom: "me", birthYear: YEAR - 15 },
        },
        META,
      ),
    ).toEqual({ ok: true });
    const { rows } = await admin.query(
      "select id, kind, birth_year, for_whom from access_requests where email = 'sofie@personal.example'",
    );
    expect(rows[0]).toMatchObject({ kind: "personal", birth_year: YEAR - 15, for_whom: "me" });

    const issued = await approveAccessRequest(OWNER, rows[0].id);
    const invitation = await findValidInvitation(tokenOf(issued.url));
    expect(invitation?.personal).toEqual({
      forWhom: "me",
      birthYear: YEAR - 15,
      childName: null,
      childEmail: null,
    });
    // A renewed link makes what the first would have made.
    const renewed = await renewInvitation(OWNER, issued.id);
    expect((await findValidInvitation(tokenOf(renewed.url)))?.personal?.birthYear).toBe(YEAR - 15);
    expect(await findValidInvitation(tokenOf(issued.url))).toBeNull();
  });

  it("the owner cannot mint a direct link for a 14-year-old alone", async () => {
    await expect(
      createInvitation(OWNER, {
        email: "tolv@personal-direct.example",
        organizationName: "Tolvs træning",
        personal: { forWhom: "me", birthYear: YEAR - 14, childName: null, childEmail: null },
      }),
    ).rejects.toThrow("INVALID");
  });
});

describe("registering a personal workspace", () => {
  it("makes the person owner and rider of a workspace of the kind 'personal'", async () => {
    const issued = await createInvitation(OWNER, {
      email: "mads@personal.example",
      organizationName: "Mads' træning",
      personal: { forWhom: "me", birthYear: YEAR - 16, childName: null, childEmail: null },
    });
    const result = await registerUserWithOrganization(new Headers(), {
      name: "Mads Kirk",
      email: "mads@personal.example",
      password: PASSWORD,
      organizationName: "Noget andet",
      invitationToken: tokenOf(issued.url),
    });
    expect(result).toEqual({ ok: true });
    const ws = await workspaceOf("mads@personal.example");
    expect(ws).toMatchObject({ name: "Mads' træning", kind: "personal", role: "owner" });
    const riders = await admin.query(
      "select name, birth_year, user_id, category_override from riders where org_id = $1",
      [ws.id],
    );
    expect(riders.rows).toEqual([
      { name: "Mads Kirk", birth_year: YEAR - 16, user_id: ws.user_id, category_override: null },
    ]);
  });

  it("for a parent, makes the child's rider row without an account, and the child's link", async () => {
    const issued = await createInvitation(OWNER, {
      email: "mor@personal.example",
      organizationName: "Idas træning",
      personal: {
        forWhom: "child",
        birthYear: YEAR - 10,
        childName: "Ida Berg",
        childEmail: "ida@personal.example",
      },
    });
    const result = await registerUserWithOrganization(new Headers(), {
      name: "Hanne Berg",
      email: "mor@personal.example",
      password: PASSWORD,
      organizationName: "Idas træning",
      invitationToken: tokenOf(issued.url),
    });
    expect(result).toEqual({ ok: true });
    const ws = await workspaceOf("mor@personal.example");
    expect(ws).toMatchObject({ kind: "personal", role: "owner" });
    const riders = await admin.query(
      "select name, birth_year, user_id, invitation_id from riders where org_id = $1",
      [ws.id],
    );
    expect(riders.rows).toHaveLength(1);
    expect(riders.rows[0]).toMatchObject({
      name: "Ida Berg",
      birth_year: YEAR - 10,
      user_id: null,
    });
    const link = await admin.query(
      "select email, organization_id, status from invitations where id = $1",
      [riders.rows[0].invitation_id],
    );
    expect(link.rows[0]).toEqual({
      email: "ida@personal.example",
      organization_id: ws.id,
      status: "pending",
    });
  });

  it("without the child's address, the row waits for the parent to invite later", async () => {
    const issued = await createInvitation(OWNER, {
      email: "far@personal.example",
      organizationName: "Ottos træning",
      personal: { forWhom: "child", birthYear: YEAR - 9, childName: "Otto", childEmail: null },
    });
    await registerUserWithOrganization(new Headers(), {
      name: "Per Lund",
      email: "far@personal.example",
      password: PASSWORD,
      organizationName: "x",
      invitationToken: tokenOf(issued.url),
    });
    const ws = await workspaceOf("far@personal.example");
    const riders = await admin.query(
      "select name, user_id, invitation_id from riders where org_id = $1",
      [ws.id],
    );
    expect(riders.rows).toEqual([{ name: "Otto", user_id: null, invitation_id: null }]);
  });

  it("refuses a link that would admit someone under 15 alone, before any account exists", async () => {
    const { token, hash } = newInvitationToken();
    await admin.query(
      `insert into access_invitations (email, organization_name, kind, birth_year, for_whom, token_hash, invited_by, expires_at)
       values ('for-ung@personal.example', 'Unges træning', 'personal', $1, 'me', $2, $3, now() + interval '1 day')`,
      [YEAR - 14, hash, OWNER],
    );
    expect(hashInvitationToken(token)).toBe(hash);
    const result = await registerUserWithOrganization(new Headers(), {
      name: "For Ung",
      email: "for-ung@personal.example",
      password: PASSWORD,
      organizationName: "x",
      invitationToken: token,
    });
    expect(result).toEqual({ ok: false, error: "tooYoung" });
    const { rowCount } = await admin.query(
      "select 1 from users where email = 'for-ung@personal.example'",
    );
    expect(rowCount).toBe(0);
  });

  it("a club's invitation still makes a club", async () => {
    const issued = await createInvitation(OWNER, {
      email: "klub@personal.example",
      organizationName: "Klubben",
    });
    expect(
      personalSpecOf({
        kind: "club",
        birthYear: null,
        forWhom: null,
        childName: null,
        childEmail: null,
      }),
    ).toBeNull();
    await registerUserWithOrganization(new Headers(), {
      name: "Træner",
      email: "klub@personal.example",
      password: PASSWORD,
      organizationName: "Klubben",
      invitationToken: tokenOf(issued.url),
    });
    expect((await workspaceOf("klub@personal.example")).kind).toBe("club");
  });
});
