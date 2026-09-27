import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { auth } from "@/core/auth/auth";
import { registerUserWithOrganization } from "@/core/auth/register";
import { registerInvited } from "@/core/team/register";
import { inviteMember } from "@/core/team/service";
import { adminPool } from "../helpers/db";

/**
 * The review's first finding, closed: Better Auth answers any member with
 * the team's invitations (each id a join link) and every member's address.
 * A rider must get neither — only a coach does — or a rider could register
 * as a pending coach invitation and become a coach, or a teammate as a
 * pending parent (src/core/auth/coach-only.ts).
 */

const PASSWORD = "en-meget-lang-kode-123";
let admin: Pool;
let coach: Headers;
let rider: Headers;
let orgId: string;

function cookies(responseHeaders: Headers): Headers {
  const cookie = responseHeaders
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  return new Headers({ cookie });
}

async function signIn(email: string) {
  const { headers } = await auth.api.signInEmail({
    body: { email, password: PASSWORD },
    returnHeaders: true,
  });
  return cookies(headers);
}

beforeAll(async () => {
  admin = adminPool();
  await registerUserWithOrganization(new Headers(), {
    name: "Træner",
    email: "leak-coach@example.com",
    password: PASSWORD,
    organizationName: "Lækhold",
  });
  coach = await signIn("leak-coach@example.com");
  orgId = (await admin.query("select id from organizations where name = 'Lækhold'")).rows[0].id;
  const invited = await inviteMember(coach, { email: "leak-rider@example.com", role: "member" });
  if (!invited.ok) throw new Error(invited.error);
  await registerInvited(new Headers(), {
    invitationId: invited.invitation.id,
    name: "Rytter",
    password: PASSWORD,
  });
  rider = await signIn("leak-rider@example.com");
  await auth.api.setActiveOrganization({ body: { organizationId: orgId }, headers: rider });
  await inviteMember(coach, { email: "pending-coach@example.com", role: "admin" });
});

afterAll(async () => {
  await admin.end();
});

describe("what Better Auth tells a rider about the team", () => {
  it("lists no invitations", async () => {
    const list = await auth.api.listInvitations({
      headers: rider,
      query: { organizationId: orgId },
    });
    expect(list).toEqual([]);
    const forCoach = await auth.api.listInvitations({
      headers: coach,
      query: { organizationId: orgId },
    });
    expect((forCoach as Array<{ email: string }>).map((i) => i.email)).toContain(
      "pending-coach@example.com",
    );
  });

  it("gives the team's name without its members' addresses or invitations", async () => {
    const full = (await auth.api.getFullOrganization({
      headers: rider,
      query: { organizationId: orgId },
    })) as { name: string; members: Array<{ user: { email: string } }>; invitations: unknown[] };
    expect(full.name).toBe("Lækhold");
    expect(full.invitations).toEqual([]);
    expect(full.members.map((m) => m.user.email)).toEqual(["leak-rider@example.com"]);
  });

  it("does not let the plugin delete a team behind the audit trail's back", async () => {
    await expect(
      auth.api.deleteOrganization({ headers: coach, body: { organizationId: orgId } }),
    ).rejects.toThrow();
  });
});
