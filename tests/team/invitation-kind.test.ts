import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { joinAs } from "@/app/[locale]/(auth)/join/[id]/join-as";
import { auth } from "@/core/auth/auth";
import { registerUserWithOrganization } from "@/core/auth/register";
import type { OrgContext } from "@/core/db/tenant";
import { invitationKind } from "@/core/team/invitation-kind";
import { registerInvited } from "@/core/team/register";
import { cancelInvitation, inviteMember } from "@/core/team/service";
import { addGuardian, attachGuardianInvitation } from "@/modules/team/guardians";
import { attachRiderInvitation, createRider } from "@/modules/team/riders";
import { adminPool, appClient, authClient, expectSqlError } from "../helpers/db";

/**
 * The join page may say "som rytter" or "som forælder til Emma" (P1-03,
 * docs/adr/0065): `invitation_kind` (drizzle/0030) answers the auth role,
 * before anybody is signed in, which a still valid invitation is for — and
 * nothing else: one word, a parent's rider's first name, no row for an
 * invitation that is used, taken back, out of date or unknown, and no
 * answer at all to the application role.
 */

const PASSWORD = "en-meget-lang-kode-123";
let admin: Pool;
let app: Client;
let authRole: Client;
let coachHeaders: Headers;
let coach: OrgContext;
let riderId: string;
const ids = {} as Record<
  "rider" | "parent" | "coach" | "plain" | "expired" | "canceled" | "archived",
  string
>;

function cookieHeaderFrom(responseHeaders: Headers): Headers {
  const cookie = responseHeaders
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  return new Headers({ cookie });
}

async function invite(email: string, role: "member" | "admin" = "member"): Promise<string> {
  const invited = await inviteMember(coachHeaders, { email, role });
  if (!invited.ok) throw new Error(invited.error);
  return invited.invitation.id;
}

/** Exactly what the auth role gets back, columns and all. */
async function asked(invitationId: string) {
  const result = await authRole.query("select * from invitation_kind($1)", [invitationId]);
  return { columns: result.fields.map((f) => f.name), rows: result.rows };
}

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  authRole = await authClient();
  await registerUserWithOrganization(new Headers(), {
    name: "Lise Træner",
    email: "kind-coach@example.com",
    password: PASSWORD,
    organizationName: "Invitationsholdet U17",
  });
  const { headers } = await auth.api.signInEmail({
    body: { email: "kind-coach@example.com", password: PASSWORD },
    returnHeaders: true,
  });
  coachHeaders = cookieHeaderFrom(headers);
  const org = await admin.query(
    "select id from organizations where name = 'Invitationsholdet U17'",
  );
  const user = await admin.query("select id from users where email = 'kind-coach@example.com'");
  coach = { orgId: org.rows[0].id, userId: user.rows[0].id };

  const rider = { birthYear: 2010, sex: null, categoryOverride: null };
  riderId = (await createRider(coach, { ...rider, name: "  Emma Sofie Hansen " })).id;
  ids.rider = await invite("kind-emma@example.com");
  await attachRiderInvitation(coach, riderId, ids.rider);

  const mother = await addGuardian(coach, { riderId, name: "Hanne Hansen", relation: "mother" });
  ids.parent = await invite("kind-hanne@example.com");
  await attachGuardianInvitation(coach, mother.id, ids.parent);

  ids.coach = await invite("kind-assistant@example.com", "admin");
  ids.plain = await invite("kind-manager@example.com");

  const late = (await createRider(coach, { ...rider, name: "Oskar Holm" })).id;
  ids.expired = await invite("kind-oskar@example.com");
  await attachRiderInvitation(coach, late, ids.expired);
  await admin.query(
    "update invitations set expires_at = now() - interval '1 minute' where id = $1",
    [ids.expired],
  );

  const withdrawn = await addGuardian(coach, { riderId, name: "Far", relation: "father" });
  ids.canceled = await invite("kind-far@example.com");
  await attachGuardianInvitation(coach, withdrawn.id, ids.canceled);
  await cancelInvitation(coachHeaders, ids.canceled);

  const gone = (await createRider(coach, { ...rider, name: "Ida Gone" })).id;
  ids.archived = await invite("kind-ida@example.com");
  await attachRiderInvitation(coach, gone, ids.archived);
  await admin.query("update riders set archived = true where id = $1", [gone]);
});

afterAll(async () => {
  await app?.end();
  await authRole?.end();
  await admin?.end();
});

describe("invitation_kind", () => {
  it("says rider for a rider's invitation, and nothing more", async () => {
    expect(await asked(ids.rider)).toEqual({
      columns: ["kind", "rider_first_name"],
      rows: [{ kind: "rider", rider_first_name: null }],
    });
    expect(await invitationKind(ids.rider)).toEqual({ kind: "rider" });
  });

  it("says guardian and the rider's first name for a parent's invitation, and nothing more", async () => {
    expect(await asked(ids.parent)).toEqual({
      columns: ["kind", "rider_first_name"],
      rows: [{ kind: "guardian", rider_first_name: "Emma" }],
    });
    expect(await invitationKind(ids.parent)).toEqual({ kind: "guardian", riderFirstName: "Emma" });
  });

  it("answers nothing for an invitation that is out of date, taken back, or for an archived rider", async () => {
    for (const id of [ids.expired, ids.canceled, ids.archived]) {
      expect((await asked(id)).rows, id).toEqual([]);
      expect(await invitationKind(id)).toBeNull();
    }
  });

  it("answers nothing for an unknown id, or for what is no id", async () => {
    for (const id of ["inv_unknown", "", ids.rider.slice(0, -1), `${ids.rider}x`, `${ids.rider} `])
      expect((await asked(id)).rows, id).toEqual([]);
    expect(await invitationKind("inv_unknown")).toBeNull();
    expect(await invitationKind("")).toBeNull();
    const nothing = await authRole.query("select * from invitation_kind(null)");
    expect(nothing.rows).toEqual([]);
  });

  it("answers nothing for an invitation no rider or parent row carries", async () => {
    expect((await asked(ids.coach)).rows).toEqual([]);
    expect((await asked(ids.plain)).rows).toEqual([]);
  });

  it("counts only rows on the invitation's own team", async () => {
    await admin.query(
      `insert into organizations (id, name, slug, created_at)
       values ('org_kind_other', 'Et andet hold', 'kind-other', now())`,
    );
    await admin.query(
      `insert into riders (id, org_id, name, birth_year, invitation_id)
       values ('kind_foreign', 'org_kind_other', 'Fremmed Rytter', 2009, $1)`,
      [ids.plain],
    );
    expect((await asked(ids.plain)).rows).toEqual([]);
  });

  it("answers nothing once the invitation is used", async () => {
    const used = await invite("kind-used@example.com");
    const row = (
      await createRider(coach, {
        name: "Bo Brugt",
        birthYear: 2009,
        sex: null,
        categoryOverride: null,
      })
    ).id;
    await attachRiderInvitation(coach, row, used);
    expect((await asked(used)).rows).toEqual([{ kind: "rider", rider_first_name: null }]);
    const joined = await registerInvited(new Headers(), {
      invitationId: used,
      name: "Bo",
      password: PASSWORD,
    });
    expect(joined.ok).toBe(true);
    expect((await asked(used)).rows).toEqual([]);
  });

  it("is the auth role's alone, and the auth role still reads no rider or parent row", async () => {
    const { rows } = await admin.query(
      `select has_function_privilege('kadence_app', 'invitation_kind(text)', 'execute') as app,
              has_function_privilege('kadence_auth', 'invitation_kind(text)', 'execute') as auth,
              has_function_privilege('public', 'invitation_kind(text)', 'execute') as anyone`,
    );
    expect(rows[0]).toEqual({ app: false, auth: true, anyone: false });
    expect(await expectSqlError(app.query("select * from invitation_kind($1)", [ids.rider]))).toBe(
      "42501",
    );
    expect(await expectSqlError(authRole.query("select name from riders"))).toBe("42501");
    expect(await expectSqlError(authRole.query("select name from guardians"))).toBe("42501");
  });
});

describe("what the join page says", () => {
  it("goes by the coach's role first, then by the row", () => {
    expect(joinAs(true, { kind: "rider" })).toEqual({ role: "coach", child: "" });
    expect(joinAs(false, { kind: "rider" })).toEqual({ role: "rider", child: "" });
    expect(joinAs(false, { kind: "guardian", riderFirstName: "Emma" })).toEqual({
      role: "parentOf",
      child: "Emma",
    });
    expect(joinAs(false, { kind: "guardian", riderFirstName: null })).toEqual({
      role: "parent",
      child: "",
    });
    expect(joinAs(false, null)).toEqual({ role: "member", child: "" });
  });
});
