import { describe, expect, it } from "vitest";
import { individualsAdmit, isSelfSignupProof, selfSignupHeaderValue } from "@/core/auth/signup";
import { EnvSchema } from "@/core/env";

/**
 * Door 2's setting and rule, without a database (docs/adr/0088):
 * SIGNUP=individuals starts only with mail, and the sign-up gate admits
 * a self-signup only for a personal workspace, with mail, under
 * individuals, carrying a key bound to the kind, the address and the day.
 * tests/access/self-signup.test.ts drives the endpoint itself.
 */

describe("the setting", () => {
  const REQUIRED = {
    APP_DATABASE_URL: "postgres://app:app@localhost:5432/kadence",
    AUTH_DATABASE_URL: "postgres://auth:auth@localhost:5432/kadence",
    BETTER_AUTH_SECRET: "not-a-real-secret-for-tests-only",
  };
  const MAIL = {
    SMTP_HOST: "smtp.test.invalid",
    SMTP_PORT: "587",
    SMTP_USER: "test",
    SMTP_PASSWORD: "test-password",
    MAIL_FROM: "kadence@example.com",
  };

  it("refuses to start with SIGNUP=individuals and no mail, and says why", () => {
    const result = EnvSchema.safeParse({ ...REQUIRED, SIGNUP: "individuals" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("SIGNUP=individuals needs mail");
  });

  it("starts with SIGNUP=individuals and mail", () => {
    expect(EnvSchema.parse({ ...REQUIRED, ...MAIL, SIGNUP: "individuals" }).SIGNUP).toBe(
      "individuals",
    );
  });
});

describe("the rule", () => {
  it("admits only our flow, for a personal workspace, with mail, under individuals", () => {
    const personal = { selfSignup: true, kind: "personal" };
    expect(individualsAdmit("individuals", true, personal)).toBe(true);
    expect(individualsAdmit("individuals", false, personal)).toBe(false);
    expect(individualsAdmit("closed", true, personal)).toBe(false);
    expect(individualsAdmit("individuals", true, { selfSignup: true, kind: "club" })).toBe(false);
    expect(individualsAdmit("individuals", true, { selfSignup: false, kind: "personal" })).toBe(
      false,
    );
    expect(individualsAdmit("individuals", true, {})).toBe(false);
  });

  it("binds the key to the kind, the address and the day", () => {
    const now = new Date("2026-10-11T12:00:00Z");
    const key = selfSignupHeaderValue("personal", "a@example.com", now);
    expect(isSelfSignupProof(key, "personal", "A@example.com ", now)).toBe(true);
    expect(
      isSelfSignupProof(key, "personal", "a@example.com", new Date("2026-10-12T08:00:00Z")),
    ).toBe(true);
    expect(
      isSelfSignupProof(key, "personal", "a@example.com", new Date("2026-10-13T08:00:00Z")),
    ).toBe(false);
    expect(isSelfSignupProof(key, "club", "a@example.com", now)).toBe(false);
    expect(isSelfSignupProof(key, "personal", "b@example.com", now)).toBe(false);
    expect(isSelfSignupProof("forged", "personal", "a@example.com", now)).toBe(false);
  });
});
