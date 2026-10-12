import type { Pool } from "pg";
import { env } from "@/core/env";

/**
 * What the billing tests share (docs/adr/0090): BILLING turned on for the
 * length of a file — `env` is read when a plan is asked for, so setting it
 * is enough, and it is put back afterwards — and a workspace put in a plan
 * as the database's own functions would leave it.
 */
export function withBilling(on: "on" | "off" = "on"): () => void {
  const before = env.BILLING;
  Object.assign(env, { BILLING: on });
  return () => Object.assign(env, { BILLING: before });
}

/** Mail on, through whatever transport the test gave the mailer. */
export function withMail(): () => void {
  const keys = {
    SMTP_HOST: "smtp.test.invalid",
    SMTP_PORT: 587,
    SMTP_USER: "test",
    SMTP_PASSWORD: "test-password",
    MAIL_FROM: "Kadence <kadence@example.com>",
  };
  const before = Object.fromEntries(Object.keys(keys).map((k) => [k, env[k as keyof typeof keys]]));
  Object.assign(env, keys);
  return () => Object.assign(env, before);
}

export async function setPlan(
  admin: Pool,
  orgId: string,
  plan: "free" | "trial" | "paid" | "expired",
  dates: { trial?: string; paid?: string } = {},
): Promise<void> {
  const at = (offset?: string) => (offset ? `now() + interval '${offset}'` : "null");
  await admin.query(
    `update organizations set plan = $2, trial_ends_at = ${at(dates.trial)},
       paid_until = ${at(dates.paid)}, free_until = null, free_reason = null where id = $1`,
    [orgId, plan],
  );
}
