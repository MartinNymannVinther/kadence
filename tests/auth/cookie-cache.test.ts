import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { adminPool } from "../helpers/db";

/**
 * Better Auth's cookie cache (docs/adr/0083): the session is read from a
 * signed cookie for five minutes rather than from the database on every
 * request. What must not wait five minutes: removal from a team, which
 * getOrgContext reads from the memberships on every page; joining or
 * leaving one, which Better Auth writes to the database and not to the
 * cookie; and signing out, which clears the cookie.
 */

const request = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  // Outside a request nothing can be set; Better Auth's nextCookies says so and moves on.
  cookies: async () => {
    throw new Error("`cookies` was called outside a request scope.");
  },
}));

const { auth } = await import("@/core/auth/auth");
const { registerUserWithOrganization } = await import("@/core/auth/register");
const { getOrgContext, getSession } = await import("@/core/auth/session");
const { registerInvited } = await import("@/core/team/register");
const { inviteMember, leaveWorkspace, removeMember } = await import("@/core/team/service");

const PASSWORD = "en-meget-lang-kode-123";
const CACHE_COOKIE = "better-auth.session_data";
let admin: Pool;
let coachHeaders: Headers;
let orgId: string;

function cookieHeaderFrom(responseHeaders: Headers): Headers {
  const cookie = responseHeaders
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  return new Headers({ cookie });
}

async function signIn(email: string): Promise<{ headers: Headers; setCookies: string[] }> {
  const { headers } = await auth.api.signInEmail({
    body: { email, password: PASSWORD },
    returnHeaders: true,
  });
  return { headers: cookieHeaderFrom(headers), setCookies: headers.getSetCookie() };
}

async function userId(email: string): Promise<string> {
  return (await admin.query("select id from users where email = $1", [email])).rows[0].id;
}

/** A person invited to the coach's team who has registered through the link. */
async function joined(email: string): Promise<Headers> {
  const invited = await inviteMember(coachHeaders, { email, role: "member" });
  if (!invited.ok) throw new Error(invited.error);
  const result = await registerInvited(new Headers(), {
    invitationId: invited.invitation.id,
    name: "Ny",
    password: PASSWORD,
  });
  if (!result.ok || !result.sessionHeaders) throw new Error(`${email} could not join`);
  return result.sessionHeaders;
}

async function contextFor(headers: Headers) {
  request.headers = headers;
  return getOrgContext();
}

beforeAll(async () => {
  admin = adminPool();
  await registerUserWithOrganization(new Headers(), {
    name: "Træner",
    email: "cache-coach@example.com",
    password: PASSWORD,
    organizationName: "Cacheholdet",
  });
  coachHeaders = (await signIn("cache-coach@example.com")).headers;
  orgId = (await admin.query("select id from organizations where name = 'Cacheholdet'")).rows[0].id;
});

afterAll(async () => {
  await admin.end();
});

describe("the cookie cache", () => {
  it("is set at sign-in, and a page reads the session from it", async () => {
    await joined("cache-reader@example.com");
    const { headers, setCookies } = await signIn("cache-reader@example.com");
    expect(setCookies.some((c) => c.startsWith(`${CACHE_COOKIE}=`))).toBe(true);

    // With the session row gone the cookie still answers: the page asked
    // the database nothing about the session. This is the five minutes
    // the cache costs a session revoked elsewhere, and why the team is
    // never taken from it.
    const id = await userId("cache-reader@example.com");
    await admin.query("delete from sessions where user_id = $1", [id]);
    request.headers = headers;
    expect((await getSession())?.user.id).toBe(id);
  });

  it("does not outlive removal from the team: the next page has no team", async () => {
    await joined("cache-removed@example.com");
    const { headers } = await signIn("cache-removed@example.com");
    const id = await userId("cache-removed@example.com");
    expect(await contextFor(headers)).toEqual({ orgId, userId: id });

    expect(await removeMember(coachHeaders, "cache-removed@example.com")).toBe(true);
    request.headers = headers;
    expect((await getSession())?.session.activeOrganizationId).toBe(orgId);
    expect(await contextFor(headers)).toBeNull();
  });

  it("does not keep a person who left on the team they left", async () => {
    await joined("cache-leaver@example.com");
    const { headers } = await signIn("cache-leaver@example.com");
    expect(await contextFor(headers)).not.toBeNull();
    expect(await leaveWorkspace(headers, orgId)).toBe(true);
    expect(await contextFor(headers)).toBeNull();
  });

  it("opens the team a new person just joined, though the sign-up's cookie named none", async () => {
    const headers = await joined("cache-newcomer@example.com");
    expect(await contextFor(headers)).toEqual({
      orgId,
      userId: await userId("cache-newcomer@example.com"),
    });
  });

  it("is cleared by signing out, and the session with it", async () => {
    await joined("cache-out@example.com");
    const { headers } = await signIn("cache-out@example.com");
    const out = await auth.api.signOut({ headers, returnHeaders: true });
    const cleared = out.headers.getSetCookie().find((c) => c.startsWith(`${CACHE_COOKIE}=`));
    expect(cleared).toMatch(/Max-Age=0/i);

    // The browser keeps what is left after the sign-out's cookies.
    const left = new Headers({
      cookie: headers
        .get("cookie")!
        .split("; ")
        .filter(
          (pair) => !out.headers.getSetCookie().some((c) => c.startsWith(pair.split("=")[0]!)),
        )
        .join("; "),
    });
    expect(await contextFor(left)).toBeNull();
  });
});
