import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EnvSchema } from "@/core/env";

/**
 * The two settings behind what a workspace pays (docs/adr/0090): BILLING
 * off by default and on only with mail, since the owners are reminded by
 * mail; TRIAL_DAYS 30 by default, 0 for no trial. Both reach the app and
 * the worker through docker-compose.yml and are named in .env.example.
 */

const REQUIRED = {
  APP_DATABASE_URL: "postgres://app:app@localhost:5432/kadence",
  AUTH_DATABASE_URL: "postgres://auth:auth@localhost:5432/kadence",
  BETTER_AUTH_SECRET: "not-a-real-secret-for-tests-only",
};
const MAIL = {
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_USER: "kadence",
  SMTP_PASSWORD: "secret",
  MAIL_FROM: "Kadence <kadence@example.com>",
};

describe("BILLING and TRIAL_DAYS", () => {
  it("are off and 30 days unless set", () => {
    const parsed = EnvSchema.parse(REQUIRED);
    expect(parsed.BILLING).toBe("off");
    expect(parsed.TRIAL_DAYS).toBe(30);
  });

  it("refuse billing without mail, and say why", () => {
    const result = EnvSchema.safeParse({ ...REQUIRED, BILLING: "on" });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("BILLING=on needs mail");
    expect(EnvSchema.safeParse({ ...REQUIRED, ...MAIL, BILLING: "on" }).success).toBe(true);
  });

  it("take no trial at 0 and refuse a trial that is not a number of days", () => {
    expect(EnvSchema.parse({ ...REQUIRED, TRIAL_DAYS: "0" }).TRIAL_DAYS).toBe(0);
    for (const bad of ["-1", "2.5", "forever", "4000"])
      expect(EnvSchema.safeParse({ ...REQUIRED, TRIAL_DAYS: bad }).success, bad).toBe(false);
  });

  it("are forwarded to the app and the worker, and named in .env.example", () => {
    const compose = readFileSync("docker-compose.yml", "utf8");
    for (const name of ["BILLING", "TRIAL_DAYS"])
      expect(compose).toContain(`${name}: \${${name}:-}`);
    // The worker shares the app's environment, so the daily job reads the same.
    expect(compose).toMatch(/worker:[\s\S]*environment: \*app-environment/);
    const example = readFileSync(".env.example", "utf8");
    expect(example).toMatch(/^BILLING=off$/m);
    expect(example).toMatch(/^# TRIAL_DAYS=30$/m);
  });
});
