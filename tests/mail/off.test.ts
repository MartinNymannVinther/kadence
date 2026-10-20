import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { Refused } from "@/core/action";
import { mailAccessInvitation } from "@/core/access/mail";
import { auth } from "@/core/auth/auth";
import { requestPasswordLink } from "@/core/auth/forgot";
import { resetByMail, verificationByMail } from "@/core/auth/mail-hooks";
import { askForVerification } from "@/core/auth/verify";
import { EnvSchema } from "@/core/env";
import { mailConfigured, sendMail, sendMailOnce } from "@/core/mail/mailer";
import { setWeekMail } from "@/modules/push/mail-choice";
import { runWeekMails } from "@/modules/push/mail-week";
import { mailInvitation } from "@/modules/team/mail-invitation";
import { adminPool } from "../helpers/db";
import { seedPerson } from "../helpers/rows";

/**
 * Without SMTP (docs/adr/0086) Kadence sends no mail, and every door
 * behaves as it did before there was mail: Better Auth refuses a password
 * link and a confirmation by e-mail, and nothing mail-shaped answers.
 */

const ORG = "org_mail_off";
const OWNER = { orgId: ORG, userId: "user_mail_off_owner" };
let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, OWNER.userId, "owner");
  await admin.query("update users set platform_role = 'owner' where id = $1", [OWNER.userId]);
});

afterAll(async () => {
  await admin.query("update users set platform_role = null where id = $1", [OWNER.userId]);
  await admin.end();
});

const REQUIRED = {
  APP_DATABASE_URL: "postgres://app:app@localhost:5432/kadence",
  AUTH_DATABASE_URL: "postgres://auth:auth@localhost:5432/kadence",
  BETTER_AUTH_SECRET: "not-a-real-secret-for-tests-only",
};
const SMTP = {
  SMTP_HOST: "smtp.tem.scaleway.com",
  SMTP_PORT: "587",
  SMTP_USER: "project-id",
  SMTP_PASSWORD: "secret",
  MAIL_FROM: "Kadence <kadence@haij.dk>",
};

describe("the environment", () => {
  it("has no mail by default", () => {
    const parsed = EnvSchema.parse(REQUIRED);
    expect(parsed.SMTP_HOST).toBeUndefined();
    expect(mailConfigured()).toBe(false);
  });

  it("takes the five together", () => {
    const parsed = EnvSchema.parse({ ...REQUIRED, ...SMTP });
    expect(parsed.SMTP_PORT).toBe(587);
  });

  it("refuses some of them, naming what is missing", () => {
    const { SMTP_PASSWORD: _, ...withoutPassword } = SMTP;
    const result = EnvSchema.safeParse({ ...REQUIRED, ...withoutPassword });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Missing: SMTP_PASSWORD");
    expect(EnvSchema.safeParse({ ...REQUIRED, SMTP_HOST: "smtp.example.com" }).success).toBe(false);
    expect(EnvSchema.safeParse({ ...REQUIRED, ...SMTP, SMTP_PORT: "nope" }).success).toBe(false);
  });

  it.each(["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"])(
    "docker-compose.yml forwards %s to the container",
    (name) => {
      expect(readFileSync("docker-compose.yml", "utf8")).toContain(`${name}: \${${name}:-}`);
    },
  );

  it(".env.example names all five", () => {
    const example = readFileSync(".env.example", "utf8");
    for (const name of Object.keys(SMTP)) expect(example).toContain(`# ${name}=`);
  });
});

describe("without mail", () => {
  it("gives Better Auth neither mail, so it refuses both as before", async () => {
    expect(resetByMail()).toEqual({});
    expect(verificationByMail()).toEqual({});
    await expect(
      auth.api.requestPasswordReset({ body: { email: `${OWNER.userId}@example.com` } }),
    ).rejects.toMatchObject({ body: { code: "RESET_PASSWORD_DISABLED" } });
    await expect(
      auth.api.sendVerificationEmail({ body: { email: `${OWNER.userId}@example.com` } }),
    ).rejects.toMatchObject({ body: { code: "VERIFICATION_EMAIL_NOT_ENABLED" } });
  });

  it("sends nothing and says so to every caller", async () => {
    expect(await sendMail({ to: "a@example.com", subject: "s", text: "t" })).toBe(false);
    await expect(sendMailOnce({ to: "a@example.com", subject: "s", text: "t" })).rejects.toThrow(
      "MAIL_NOT_CONFIGURED",
    );
    expect(await requestPasswordLink(new Headers(), { email: "a@example.com" }, "da")).toBe("off");
    expect(
      await askForVerification(
        new Headers(),
        { id: OWNER.userId, email: `${OWNER.userId}@example.com` },
        "da",
      ),
    ).toBe("off");
    await expect(mailInvitation(OWNER, "inv_any", "da")).rejects.toBeInstanceOf(Refused);
    await expect(setWeekMail(OWNER, true, "da")).rejects.toBeInstanceOf(Refused);
    expect(await mailAccessInvitation(OWNER.userId, "any-token", "da")).toBe("off");
    expect(await runWeekMails(new Date("2026-10-11T17:00:00Z"))).toEqual({
      people: 0,
      sent: 0,
      failed: 0,
    });
  });
});
