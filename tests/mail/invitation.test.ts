import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";

vi.hoisted(() =>
  Object.assign(process.env, {
    SMTP_HOST: "smtp.test.invalid",
    SMTP_PORT: "587",
    SMTP_USER: "test",
    SMTP_PASSWORD: "test-password",
    MAIL_FROM: "Kadence <kadence@example.com>",
  }),
);

import { Refused } from "@/core/action";
import { approveAccessRequest, submitAccessRequest } from "@/core/access/service";
import { mailAccessInvitation } from "@/core/access/mail";
import { auth } from "@/core/auth/auth";
import { registerUserWithOrganization } from "@/core/auth/register";
import type { OrgContext } from "@/core/db/tenant";
import { useMailTransportForTests } from "@/core/mail/mailer";
import { resetRateLimits } from "@/core/rate-limit";
import { inviteMember, joinUrl } from "@/core/team/service";
import { addGuardian, attachGuardianInvitation } from "@/modules/team/guardians";
import { mailInvitation } from "@/modules/team/mail-invitation";
import { attachRiderInvitation, createRider } from "@/modules/team/riders";
import { adminPool } from "../helpers/db";
import { FakeTransport, linksIn } from "../helpers/mail";
import { seedPerson } from "../helpers/rows";

/**
 * "Send på mail" (docs/adr/0086): a coach sends an open invitation of the
 * team to its own address; the mail says who invited the person to which
 * team, as a rider or a parent of the child's first name, and the link.
 * Only a coach, only this team's invitation, audited without an address.
 * And the owner's "Send linket" for an approved application.
 */

const PASSWORD = "en-meget-lang-kode-123";
let admin: Pool;
let coach: OrgContext;
let coachHeaders: Headers;
let riderInvitation: string;
let parentInvitation: string;
const fake = new FakeTransport();

async function invite(email: string): Promise<string> {
  const invited = await inviteMember(coachHeaders, { email, role: "member" });
  if (!invited.ok) throw new Error(invited.error);
  return invited.invitation.id;
}

beforeAll(async () => {
  admin = adminPool();
  useMailTransportForTests(fake);
  await registerUserWithOrganization(new Headers(), {
    name: "Lise Træner",
    email: "mail-coach@example.com",
    password: PASSWORD,
    organizationName: "Mailholdet U17",
  });
  const { headers } = await auth.api.signInEmail({
    body: { email: "mail-coach@example.com", password: PASSWORD },
    returnHeaders: true,
  });
  coachHeaders = new Headers({
    cookie: headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  });
  const org = await admin.query("select id from organizations where name = 'Mailholdet U17'");
  const user = await admin.query("select id from users where email = 'mail-coach@example.com'");
  coach = { orgId: org.rows[0].id, userId: user.rows[0].id };

  const riderId = (
    await createRider(coach, {
      name: "Emma Sofie Hansen",
      birthYear: 2010,
      sex: null,
      categoryOverride: null,
    })
  ).id;
  riderInvitation = await invite("mail-emma@example.com");
  await attachRiderInvitation(coach, riderId, riderInvitation);
  const mother = await addGuardian(coach, { riderId, name: "Hanne Hansen", relation: "mother" });
  parentInvitation = await invite("mail-hanne@example.com");
  await attachGuardianInvitation(coach, mother.id, parentInvitation);
});

beforeEach(async () => {
  await resetRateLimits();
  fake.clear();
});

afterAll(async () => {
  useMailTransportForTests(null);
  await admin.end();
});

describe("a team's invitation by mail", () => {
  it("tells a parent who invited them, to which team, as whose parent, and the link", async () => {
    expect(await mailInvitation(coach, parentInvitation, "da")).toEqual({
      email: "mail-hanne@example.com",
    });
    const [mail] = fake.to("mail-hanne@example.com");
    expect(mail?.subject).toBe("Du er inviteret til Mailholdet U17 i Kadence");
    expect(mail?.text).toContain(
      "Lise Træner har inviteret dig med på holdet Mailholdet U17 i Kadence som forælder til Emma.",
    );
    expect(linksIn(mail!.text)).toEqual([joinUrl(parentInvitation)]);
    for (const other of ["Sofie", "Hansen", "Hanne", "2010"])
      expect(mail?.text).not.toContain(other);
  });

  it("tells a rider they are invited as a rider, in English when the coach writes English", async () => {
    await mailInvitation(coach, riderInvitation, "en");
    const [mail] = fake.to("mail-emma@example.com");
    expect(mail?.subject).toBe("You are invited to Mailholdet U17 in Kadence");
    expect(mail?.text).toContain("as a rider.");
    expect(mail?.text).not.toContain("Emma");
  });

  it("is in the audit trail as mailed, with the invitation and no address", async () => {
    await mailInvitation(coach, riderInvitation, "da");
    const { rows } = await admin.query(
      `select org_id, actor_user_id, entity_type, entity_id, before_data, after_data, ip_address
       from audit_log where action = 'invitation.mailed' and entity_id = $1`,
      [riderInvitation],
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toEqual({
      org_id: coach.orgId,
      actor_user_id: coach.userId,
      entity_type: "invitations",
      entity_id: riderInvitation,
      before_data: null,
      after_data: null,
      ip_address: null,
    });
  });

  it("is a coach's: a member of the team is refused, and nothing is sent", async () => {
    const member = await seedPerson(admin, coach.orgId, "user_mail_member", "member");
    await expect(mailInvitation(member, riderInvitation, "da")).rejects.toMatchObject({
      code: "forbidden",
    });
    expect(fake.sent).toHaveLength(0);
  });

  it("finds only this team's open invitations", async () => {
    const stranger = await seedPerson(admin, "org_mail_other", "user_mail_other", "owner");
    await expect(mailInvitation(stranger, riderInvitation, "da")).rejects.toMatchObject({
      code: "notFound",
    });
    await expect(mailInvitation(coach, "inv_does_not_exist", "da")).rejects.toBeInstanceOf(Refused);
    expect(fake.sent).toHaveLength(0);
  });

  it("allows three mails an hour for one invitation", async () => {
    for (let i = 0; i < 3; i++) await mailInvitation(coach, parentInvitation, "da");
    await expect(mailInvitation(coach, parentInvitation, "da")).rejects.toMatchObject({
      code: "conflict",
      detail: "too_many_mails",
    });
  });

  it("says so when the provider fails twice, and records nothing", async () => {
    fake.failNext = 2;
    const before = await admin.query(
      "select count(*)::int as n from audit_log where action = 'invitation.mailed'",
    );
    await expect(mailInvitation(coach, riderInvitation, "da")).rejects.toMatchObject({
      detail: "mail_not_sent",
    });
    const after = await admin.query(
      "select count(*)::int as n from audit_log where action = 'invitation.mailed'",
    );
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });
});

describe("the owner's link by mail", () => {
  const OWNER = "user_mail_installation_owner";
  let madeOwner = false;

  beforeAll(async () => {
    await seedPerson(admin, "org_mail_owner", OWNER, "owner");
    const { rowCount } = await admin.query(
      "update users set platform_role = 'owner' where id = $1 and platform_role is null",
      [OWNER],
    );
    madeOwner = (rowCount ?? 0) > 0;
  });

  afterAll(async () => {
    if (madeOwner)
      await admin.query("update users set platform_role = null where id = $1", [OWNER]);
  });

  it("sends an approved application's link to its own address, and only an open one", async () => {
    await submitAccessRequest(
      {
        name: "Per Klub",
        email: "mail-per@example.com",
        organizationName: "Mail CK",
        message: "",
        website: "",
      },
      { ipAddress: "192.0.2.10", userAgent: null },
    );
    const request = await admin.query("select id from access_requests where email = $1", [
      "mail-per@example.com",
    ]);
    const issued = await approveAccessRequest(OWNER, request.rows[0].id);
    const token = new URL(issued.url).searchParams.get("invitation")!;

    expect(await mailAccessInvitation(OWNER, token, "da")).toEqual({
      email: "mail-per@example.com",
    });
    const [mail] = fake.to("mail-per@example.com");
    expect(mail?.subject).toBe("Du kan nu komme ind i Kadence");
    expect(mail?.text).toContain("arbejdsrummet Mail CK");
    expect(linksIn(mail!.text)).toEqual([issued.url]);
    const audit = await admin.query(
      `select actor_user_id, after_data from audit_log
       where action = 'invitation.mailed' and entity_id = $1`,
      [issued.id],
    );
    expect(audit.rows).toEqual([{ actor_user_id: OWNER, after_data: null }]);

    expect(await mailAccessInvitation(OWNER, "not-a-real-token", "da")).toBe("notFound");
  });

  it("is the owner's alone", async () => {
    const someone = await seedPerson(admin, "org_mail_owner", "user_mail_not_owner", "member");
    await expect(mailAccessInvitation(someone.userId, "any-token", "da")).rejects.toThrow(
      "NOT_PLATFORM_OWNER",
    );
  });
});
