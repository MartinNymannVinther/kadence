import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";

const saved = vi.hoisted(() => {
  const keys = ["SIGNUP", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"];
  const before = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  Object.assign(process.env, {
    SIGNUP: "individuals",
    SMTP_HOST: "smtp.test.invalid",
    SMTP_PORT: "587",
    SMTP_USER: "test",
    SMTP_PASSWORD: "test-password",
    MAIL_FROM: "Kadence <kadence@example.com>",
  });
  return before;
});

const request = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => {
    throw new Error("`cookies` was called outside a request scope.");
  },
}));

const { auth } = await import("@/core/auth/auth");
const { cookieHeaderFrom } = await import("@/core/auth/cookies");
const { landingAfterVerify, registerSelf } = await import("@/core/auth/register-self");
const { getOrgContext, getSession } = await import("@/core/auth/session");
const { askForVerification } = await import("@/core/auth/verify");
const { mustVerifyFirst } = await import("@/core/auth/verify-first");
const { todayInCopenhagen } = await import("@/core/dates");
const { settleMail, useMailTransportForTests } = await import("@/core/mail/mailer");
const { resetRateLimits } = await import("@/core/rate-limit");
const { adminPool } = await import("../helpers/db");
const { FakeTransport, linksIn } = await import("../helpers/mail");

/**
 * Door 2's first rule (docs/adr/0088): the person who created their own
 * workspace sees /verify and nothing else until the address is
 * confirmed — the app's layout and Rulle's send them there, and no team
 * is theirs to act in — and the link in the mail opens the app on Today.
 * Nobody else is asked: not a coach, a rider or a parent who came in by a
 * team's link, nor a person from before door 2.
 */

const DOMAIN = "verify-first.example";
const PASSWORD = "en-meget-lang-kode-123";
const EMAIL = `vera@${DOMAIN}`;
const YEAR = Number(todayInCopenhagen().slice(0, 4));
let admin: Pool;
const fake = new FakeTransport();
let signedIn: Headers;

beforeAll(async () => {
  admin = adminPool();
  useMailTransportForTests(fake);
  await admin.query(
    `insert into users (id, name, email) values ('user_vf_seed', 'Seed', 'seed@${DOMAIN}')`,
  );
  const result = await registerSelf(
    new Headers({ "x-forwarded-for": "192.0.2.50" }),
    {
      name: "Vera Venter",
      email: EMAIL,
      password: PASSWORD,
      personal: { forWhom: "me", birthYear: YEAR - 16 },
      terms: true,
      health: true,
    },
    { workspaceName: (first) => `${first}s træning`, locale: "da" },
  );
  expect(result).toEqual({ ok: true });
  const { headers } = await auth.api.signInEmail({
    body: { email: EMAIL, password: PASSWORD },
    returnHeaders: true,
  });
  signedIn = cookieHeaderFrom(headers);
});

beforeEach(() => {
  request.headers = signedIn;
});

afterAll(async () => {
  useMailTransportForTests(null);
  await admin.query(
    `delete from organizations where id in (
       select organization_id from memberships m join users u on u.id = m.user_id
       where u.email like '%@${DOMAIN}')`,
  );
  await admin.query(`delete from users where email like '%@${DOMAIN}'`);
  await admin.end();
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("before the address is confirmed", () => {
  it("must confirm first, and has no team to act in", async () => {
    const session = await getSession();
    expect(session?.user).toMatchObject({ selfSignup: true, emailVerified: false });
    expect(session?.session.activeOrganizationId).toBeTruthy();
    expect(await mustVerifyFirst(session!.user)).toBe(true);
    expect(await getOrgContext()).toBeNull();
  });

  it("is sent to /verify by the app's layout and by Rulle's, and /verify does not send them on", () => {
    const read = (path: string) =>
      readFileSync(join(process.cwd(), "src/app/[locale]", path), "utf8");
    for (const layout of ["(app)/layout.tsx", "(ride)/layout.tsx"]) {
      const source = read(layout);
      expect(source, layout).toMatch(
        /if \(await mustVerifyFirst\(session\.user\)\) \{\s*redirect\(\{ href: VERIFY_PATH, locale \}\);/,
      );
    }
    const verify = read("(auth)/verify/page.tsx");
    expect(verify).toMatch(
      /if \(!\(await mustVerifyFirst\(session\.user\)\)\) \{\s*redirect\(\{ href: "\/today"/,
    );
  });

  it("can ask for the mail again three times an hour, landing on Today", async () => {
    await resetRateLimits();
    fake.clear();
    const { id } = (await getSession())!.user;
    for (let i = 0; i < 3; i++)
      expect(
        await askForVerification(signedIn, { id, email: EMAIL }, "da", landingAfterVerify("da")),
      ).toBe("sent");
    expect(
      await askForVerification(signedIn, { id, email: EMAIL }, "da", landingAfterVerify("da")),
    ).toBe("rateLimited");
    await settleMail();
    expect(fake.to(EMAIL)).toHaveLength(3);
  });
});

describe("the link in the mail", () => {
  it("confirms the address, lands on Today and opens the app, before the cookie has heard", async () => {
    const [mail] = fake.to(EMAIL);
    const link = new URL(linksIn(mail!.text)[0]!);
    expect(link.searchParams.get("callbackURL")).toBe("/today");
    const response = await auth.handler(new Request(link));
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/today");

    // The session's cookie still says unconfirmed for up to five minutes;
    // the database is asked, and it says confirmed.
    const session = await getSession();
    expect(session?.user.emailVerified).toBe(false);
    expect(await mustVerifyFirst(session!.user)).toBe(false);
    const ctx = await getOrgContext();
    expect(ctx?.orgId).toBe(session?.session.activeOrganizationId);
  });
});

describe("everyone else", () => {
  it("is not asked: an account from a team's link, an application, or before door 2", async () => {
    expect(await mustVerifyFirst({ id: "anyone", emailVerified: false, selfSignup: false })).toBe(
      false,
    );
    expect(await mustVerifyFirst({ id: "anyone", emailVerified: false })).toBe(false);
    expect(await mustVerifyFirst({ id: "anyone", emailVerified: true, selfSignup: true })).toBe(
      false,
    );
  });
});
