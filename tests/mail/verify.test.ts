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
import { addressVerified, askForVerification } from "@/core/auth/verify";
import { env } from "@/core/env";
import { settleMail, useMailTransportForTests } from "@/core/mail/mailer";
import { resetRateLimits } from "@/core/rate-limit";
import { adminPool } from "../helpers/db";
import { FakeTransport, linksIn } from "../helpers/mail";
import { seedPerson } from "../helpers/rows";

/**
 * "Bekræft din adresse" (docs/adr/0086): a link to the person's own
 * address, Better Auth's confirmation behind it, a check mark after, and
 * nothing required of anyone yet.
 */

const ORG = "org_verify";
const IDA = { id: "user_verify_ida", email: "user_verify_ida@example.com" };
const BO = { id: "user_verify_bo", email: "user_verify_bo@example.com" };

let admin: Pool;
const fake = new FakeTransport();

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, IDA.id, "member");
  await seedPerson(admin, ORG, BO.id, "member");
  useMailTransportForTests(fake);
});

beforeEach(async () => {
  await resetRateLimits();
  fake.clear();
});

afterAll(async () => {
  useMailTransportForTests(null);
  await admin.end();
});

describe("confirming an address", () => {
  it("sends a link to the person's own address, which confirms it once followed", async () => {
    expect(await addressVerified(IDA.id)).toBe(false);
    expect(await askForVerification(new Headers(), IDA, "da")).toBe("sent");
    await settleMail();
    const [mail] = fake.to(IDA.email);
    expect(mail?.subject).toBe("Bekræft din e-mailadresse");
    const link = new URL(linksIn(mail!.text)[0]!);
    expect(link.origin).toBe(new URL(env.BETTER_AUTH_URL).origin);
    expect(link.pathname).toBe("/api/auth/verify-email");
    expect(link.searchParams.get("callbackURL")).toBe("/settings/security?verified=1");

    const response = await auth.handler(new Request(link));
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/settings/security?verified=1");
    expect(await addressVerified(IDA.id)).toBe(true);
    const audit = await admin.query(
      "select actor_user_id from audit_log where action = 'auth.email_verified' and entity_id = $1",
      [IDA.id],
    );
    expect(audit.rows).toEqual([{ actor_user_id: IDA.id }]);
  });

  it("sends nothing for an address that is already confirmed", async () => {
    expect(await askForVerification(new Headers(), IDA, "da")).toBe("verified");
    await settleMail();
    expect(fake.sent).toHaveLength(0);
  });

  it("writes in English, and comes back to the English page", async () => {
    expect(await askForVerification(new Headers(), BO, "en")).toBe("sent");
    await settleMail();
    const [mail] = fake.to(BO.email);
    expect(mail?.subject).toBe("Confirm your email address");
    expect(new URL(linksIn(mail!.text)[0]!).searchParams.get("callbackURL")).toBe(
      "/en/settings/security?verified=1",
    );
  });

  it("allows three asks an hour", async () => {
    for (let i = 0; i < 3; i++)
      expect(await askForVerification(new Headers(), BO, "da")).toBe("sent");
    expect(await askForVerification(new Headers(), BO, "da")).toBe("rateLimited");
  });

  it("says nothing to a caller at Better Auth's door about an address without an account", async () => {
    const answer = await auth.api.sendVerificationEmail({
      body: { email: "nobody-here@example.com" },
    });
    expect(answer).toEqual({ status: true });
    await settleMail();
    expect(fake.sent).toHaveLength(0);
  });

  it("is not needed to sign in", async () => {
    const response = await auth.api.signUpEmail({
      body: { name: "Ny", email: "user_verify_new@example.com", password: "et-langt-kodeord-2026" },
    });
    expect(response.user.emailVerified).toBe(false);
    expect(response.token).toBeTruthy();
    await settleMail();
    expect(fake.sent).toHaveLength(0);
  });
});
