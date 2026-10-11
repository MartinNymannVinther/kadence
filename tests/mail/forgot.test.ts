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

import { auth } from "@/core/auth/auth";
import { requestPasswordLink } from "@/core/auth/forgot";
import { env } from "@/core/env";
import { mailConfigured, settleMail, useMailTransportForTests } from "@/core/mail/mailer";
import { resetRateLimits } from "@/core/rate-limit";
import { adminPool } from "../helpers/db";
import { FakeTransport, linksIn } from "../helpers/mail";
import { seedPerson } from "../helpers/rows";

/**
 * "Glemt adgangskode?" with mail (docs/adr/0086): a link by e-mail to the
 * page a coach's link opens (ADR 0032), the same answer for an address
 * with an account and one without, five an hour per address and per
 * network address, and the mail sent in the background so the answer
 * takes no longer for a known address.
 */

const ORG = "org_forgot";
const KNOWN = "user_forgot_known";
const KNOWN_EMAIL = `${KNOWN}@example.com`;
const NEW_PASSWORD = "et-nyt-langt-kodeord-2026";

let admin: Pool;
const fake = new FakeTransport();
let ip = 0;
/** A request from its own network address, so only the address limit counts. */
const fresh = () => new Headers({ "x-forwarded-for": `198.51.100.${(ip += 1)}` });

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, KNOWN, "member");
  useMailTransportForTests(fake);
});

beforeEach(async () => {
  await resetRateLimits();
  await admin.query("delete from rate_limits");
  fake.clear();
});

afterAll(async () => {
  useMailTransportForTests(null);
  await admin.end();
});

describe("asking for a link", () => {
  it("is on because the installation sends mail", () => {
    expect(mailConfigured()).toBe(true);
  });

  it("sends a link to the address that has an account, and it sets a new password once", async () => {
    expect(await requestPasswordLink(fresh(), { email: KNOWN_EMAIL }, "da")).toBe("sent");
    await settleMail();
    const [mail] = fake.to(KNOWN_EMAIL);
    expect(mail?.subject).toBe("Vælg en ny adgangskode til Kadence");
    expect(mail?.from).toBe("Kadence <kadence@example.com>");
    const [link] = linksIn(mail!.text);
    const url = new URL(link!);
    expect(url.origin).toBe(new URL(env.BETTER_AUTH_URL).origin);
    expect(url.pathname).toBe("/reset-password");
    expect(url.searchParams.get("via")).toBe("mail");

    const token = url.searchParams.get("token")!;
    await auth.api.resetPassword({ body: { newPassword: NEW_PASSWORD, token } });
    const signedIn = await auth.api.signInEmail({
      body: { email: KNOWN_EMAIL, password: NEW_PASSWORD },
    });
    expect(signedIn.user.id).toBe(KNOWN);
    await expect(
      auth.api.resetPassword({ body: { newPassword: "et-andet-langt-kodeord", token } }),
    ).rejects.toMatchObject({ body: { code: "INVALID_TOKEN" } });
    const audit = await admin.query(
      "select 1 from audit_log where action = 'auth.password_reset' and entity_id = $1",
      [KNOWN],
    );
    expect(audit.rows.length).toBeGreaterThan(0);
  });

  it("answers an address without an account the same way, and sends nothing", async () => {
    const unknown = await requestPasswordLink(fresh(), { email: "nobody@example.com" }, "da");
    const known = await requestPasswordLink(fresh(), { email: KNOWN_EMAIL }, "da");
    expect(unknown).toBe(known);
    await settleMail();
    expect(fake.sent.map((m) => m.to)).toEqual([KNOWN_EMAIL]);
  });

  it("writes in the language it was asked in, to the page in that language", async () => {
    await requestPasswordLink(fresh(), { email: KNOWN_EMAIL.toUpperCase() }, "en");
    await settleMail();
    const [mail] = fake.to(KNOWN_EMAIL);
    expect(mail?.subject).toBe("Choose a new password for Kadence");
    expect(new URL(linksIn(mail!.text)[0]!).pathname).toBe("/en/reset-password");
  });

  it("tries the provider once more when it fails, and says nothing different", async () => {
    fake.failNext = 1;
    expect(await requestPasswordLink(fresh(), { email: KNOWN_EMAIL }, "da")).toBe("sent");
    await settleMail();
    expect(fake.attempts).toBe(2);
    expect(fake.to(KNOWN_EMAIL)).toHaveLength(1);
  });

  it("refuses what is not an address", async () => {
    expect(await requestPasswordLink(fresh(), { email: "ikke en adresse" }, "da")).toBe("invalid");
    expect(await requestPasswordLink(fresh(), {}, "da")).toBe("invalid");
  });
});

describe("the counts", () => {
  it("allow five an hour for one address, with or without an account", async () => {
    for (const email of [KNOWN_EMAIL, "nobody-counted@example.com"]) {
      for (let i = 0; i < 5; i++)
        expect(await requestPasswordLink(fresh(), { email }, "da"), email).toBe("sent");
      expect(await requestPasswordLink(fresh(), { email }, "da"), email).toBe("rateLimited");
    }
    await settleMail();
    expect(fake.to(KNOWN_EMAIL)).toHaveLength(5);
  });

  it("allow five an hour from one network address, whatever it asks for", async () => {
    const same = new Headers({ "x-forwarded-for": "203.0.113.77" });
    for (let i = 0; i < 5; i++)
      expect(await requestPasswordLink(same, { email: `n${i}@example.com` }, "da")).toBe("sent");
    expect(await requestPasswordLink(same, { email: KNOWN_EMAIL }, "da")).toBe("rateLimited");
    await settleMail();
    expect(fake.sent).toHaveLength(0);
  });

  it("keep the counters free of addresses", async () => {
    await requestPasswordLink(fresh(), { email: KNOWN_EMAIL }, "da");
    const { rows } = await admin.query("select key from app_rate_limits");
    expect(rows.length).toBeGreaterThan(0);
    for (const { key } of rows) expect(key).not.toContain("@");
  });

  it("send no more than five a person an hour to a caller who goes to Better Auth directly", async () => {
    for (let i = 0; i < 7; i++)
      await auth.api.requestPasswordReset({ body: { email: KNOWN_EMAIL } });
    await settleMail();
    expect(fake.to(KNOWN_EMAIL)).toHaveLength(5);
  });
});
