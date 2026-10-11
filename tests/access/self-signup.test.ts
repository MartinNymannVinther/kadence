import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";

// Door 2 is open here: SIGNUP=individuals, with mail (docs/adr/0088). Set
// before anything reads @/core/env, and put back after, so the files after
// this one see the suite's own settings.
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

import { auth } from "@/core/auth/auth";
import { registerSelf, SELF_SIGNUPS_PER_HOUR } from "@/core/auth/register-self";
import {
  SELF_SIGNUP_HEADER,
  selfSignupHeaderValue,
  WORKSPACE_KIND_HEADER,
} from "@/core/auth/signup";
import { todayInCopenhagen } from "@/core/dates";
import { settleMail, useMailTransportForTests } from "@/core/mail/mailer";
import { resetRateLimits } from "@/core/rate-limit";
import { CONSENT_VERSION } from "@/modules/consent/service";
import { adminPool } from "../helpers/db";
import { FakeTransport, linksIn } from "../helpers/mail";

/**
 * Door 2 (docs/adr/0088): with SIGNUP=individuals and mail, a person
 * creates their own workspace without an application. The sign-up
 * endpoint admits only our own flow's key, for a personal workspace and
 * the address it was made for; a plain request, a forged key, a key for
 * another address and a key for a club are refused at the endpoint.
 */

const PASSWORD = "en-meget-lang-kode-123";
const YEAR = Number(todayInCopenhagen().slice(0, 4));
const DOMAIN = "self-signup.example";
let admin: Pool;
const fake = new FakeTransport();
let ip = 0;

/** A request from its own network address, so the hour's count is this test's. */
const from = () => new Headers({ "x-forwarded-for": `198.51.100.${++ip}` });

const names = { workspaceName: (first: string) => `${first}s træning`, locale: "da" as const };

function form(email: string, extra: Record<string, unknown> = {}) {
  return {
    name: "Selma Selv",
    email,
    password: PASSWORD,
    personal: { forWhom: "me", birthYear: YEAR - 17 },
    terms: true,
    health: true,
    ...extra,
  };
}

async function userRow(email: string) {
  const { rows } = await admin.query(
    "select id, self_signup, email_verified from users where email = $1",
    [email],
  );
  return rows[0] as { id: string; self_signup: boolean; email_verified: boolean } | undefined;
}

async function signUp(email: string, headers: Headers) {
  return auth.api
    .signUpEmail({ body: { name: "Udefra", email, password: PASSWORD }, headers })
    .then(() => "created" as const)
    .catch((error: { body?: { code?: string } }) => error.body?.code ?? "error");
}

beforeAll(async () => {
  admin = adminPool();
  // An installation with people on it: the first-account door is shut.
  await admin.query(
    `insert into users (id, name, email) values ('user_self_seed', 'Seed', 'seed@${DOMAIN}')
     on conflict do nothing`,
  );
  useMailTransportForTests(fake);
});

beforeEach(async () => {
  await resetRateLimits();
  fake.clear();
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

describe("the sign-up endpoint", () => {
  it("refuses a plain request from a browser", async () => {
    const email = `plain@${DOMAIN}`;
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ name: "Udefra", email, password: PASSWORD }),
      }),
    );
    expect(response.status).toBe(403);
    expect(await userRow(email)).toBeUndefined();
  });

  it("refuses a forged key, a key for another address and a key for a club", async () => {
    const email = `forged@${DOMAIN}`;
    const forged = new Headers({ [WORKSPACE_KIND_HEADER]: "personal", [SELF_SIGNUP_HEADER]: "1" });
    expect(await signUp(email, forged)).toBe("SIGNUP_CLOSED");
    const other = new Headers({
      [WORKSPACE_KIND_HEADER]: "personal",
      [SELF_SIGNUP_HEADER]: selfSignupHeaderValue("personal", `other@${DOMAIN}`),
    });
    expect(await signUp(email, other)).toBe("SIGNUP_CLOSED");
    const club = new Headers({
      [WORKSPACE_KIND_HEADER]: "club",
      [SELF_SIGNUP_HEADER]: selfSignupHeaderValue("club", email),
    });
    expect(await signUp(email, club)).toBe("SIGNUP_CLOSED");
    expect(await userRow(email)).toBeUndefined();
  });

  it("admits a personal attempt carrying the server's key, and marks the account", async () => {
    const email = `keyed@${DOMAIN}`;
    const headers = new Headers({
      [WORKSPACE_KIND_HEADER]: "personal",
      [SELF_SIGNUP_HEADER]: selfSignupHeaderValue("personal", email),
    });
    expect(await signUp(email, headers)).toBe("created");
    expect(await userRow(email)).toMatchObject({ self_signup: true, email_verified: false });
  });

  it("never marks an account a request body asks to mark", async () => {
    const email = `body@${DOMAIN}`;
    const headers = new Headers({
      [WORKSPACE_KIND_HEADER]: "personal",
      [SELF_SIGNUP_HEADER]: selfSignupHeaderValue("personal", email),
    });
    // `input: false` with a default: Better Auth puts the default in place
    // of whatever the body says, and our hook decides from the key alone.
    await auth.api.signUpEmail({
      body: { name: "Udefra", email, password: PASSWORD, selfSignup: false } as never,
      headers,
    });
    expect(await userRow(email)).toMatchObject({ self_signup: true });
  });
});

describe("registering oneself", () => {
  it("makes a personal workspace with its rider, the two consents and a confirmation mail", async () => {
    const email = `selma@${DOMAIN}`;
    expect(await registerSelf(from(), form(email), names)).toEqual({ ok: true });
    const user = await userRow(email);
    expect(user).toMatchObject({ self_signup: true, email_verified: false });

    const { rows: orgs } = await admin.query(
      `select o.id, o.name, o.kind, m.role from organizations o
         join memberships m on m.organization_id = o.id where m.user_id = $1`,
      [user!.id],
    );
    expect(orgs).toEqual([
      { id: orgs[0].id, name: "Selmas træning", kind: "personal", role: "owner" },
    ]);
    const { rows: riders } = await admin.query(
      "select id, user_id, birth_year from riders where org_id = $1",
      [orgs[0].id],
    );
    expect(riders).toEqual([{ id: riders[0].id, user_id: user!.id, birth_year: YEAR - 17 }]);

    const { rows: consents } = await admin.query(
      `select kind, version, locale, rider_id, user_id, withdrawn_at from consents
        where org_id = $1 order by kind`,
      [orgs[0].id],
    );
    expect(consents).toEqual(
      ["health", "terms"].map((kind) => ({
        kind,
        version: CONSENT_VERSION,
        locale: "da",
        rider_id: riders[0].id,
        user_id: user!.id,
        withdrawn_at: null,
      })),
    );

    await settleMail();
    const [mail] = fake.to(email);
    const link = new URL(linksIn(mail!.text)[0]!);
    expect(link.pathname).toBe("/api/auth/verify-email");
    expect(link.searchParams.get("callbackURL")).toBe("/today");
  });

  it("makes a parent's workspace for a child under 15, consented on the child's behalf", async () => {
    const email = `foraelder@${DOMAIN}`;
    const result = await registerSelf(
      from(),
      form(email, {
        name: "Pia Forælder",
        personal: { forWhom: "child", birthYear: YEAR - 12, childName: "Lars Lille" },
      }),
      { ...names, workspaceName: (first) => `${first}' træning`, locale: "en" },
    );
    expect(result).toEqual({ ok: true });
    const { rows } = await admin.query(
      `select o.name, c.kind, c.locale, r.name as rider, r.user_id from users u
         join memberships m on m.user_id = u.id join organizations o on o.id = m.organization_id
         join consents c on c.org_id = o.id join riders r on r.id = c.rider_id
        where u.email = $1 and c.kind = 'health'`,
      [email],
    );
    expect(rows).toEqual([
      { name: "Lars' træning", kind: "health", locale: "en", rider: "Lars Lille", user_id: null },
    ]);
  });

  it("refuses someone under 15 for themselves, and stores nothing", async () => {
    const email = `ung@${DOMAIN}`;
    const result = await registerSelf(
      from(),
      form(email, { personal: { forWhom: "me", birthYear: YEAR - 14 } }),
      names,
    );
    expect(result).toEqual({ ok: false, error: "tooYoung" });
    expect(await userRow(email)).toBeUndefined();
  });

  it("refuses without both boxes ticked", async () => {
    for (const missing of [{ terms: false }, { health: undefined }]) {
      const email = `nej@${DOMAIN}`;
      expect(await registerSelf(from(), form(email, missing), names)).toEqual({
        ok: false,
        error: "consent",
      });
      expect(await userRow(email)).toBeUndefined();
    }
  });

  it("answers a filled honeypot as if it worked, and makes nothing", async () => {
    const email = `bot@${DOMAIN}`;
    expect(await registerSelf(from(), form(email, { website: "x" }), names)).toEqual({ ok: true });
    expect(await userRow(email)).toBeUndefined();
  });

  it(`allows ${SELF_SIGNUPS_PER_HOUR} an hour from one network address`, async () => {
    const one = new Headers({ "x-forwarded-for": "203.0.113.7" });
    for (let i = 0; i < SELF_SIGNUPS_PER_HOUR; i++)
      expect(await registerSelf(one, form(`flood${i}@${DOMAIN}`), names)).toEqual({ ok: true });
    expect(await registerSelf(one, form(`flood-last@${DOMAIN}`), names)).toEqual({
      ok: false,
      error: "tooMany",
    });
    expect(await userRow(`flood-last@${DOMAIN}`)).toBeUndefined();
  });
});
