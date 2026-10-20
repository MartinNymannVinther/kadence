import type { z } from "zod";
import type { EnvShape } from "./env";

/** The value shipped in .env.example. Refused in production, by name. */
const PLACEHOLDER_SECRET = "dev-only-secret-change-me-in-production";

/**
 * What the environment's variables must say together (src/core/env.ts):
 * the halves that go in pairs, mail all or nothing, door 2 and billing only
 * with mail, and what production may not leave at a placeholder. Each
 * refusal names the variable and the fix, because the person reading it is setting up
 * an installation, not reading the code.
 */
export function envRules(value: z.infer<typeof EnvShape>, ctx: z.RefinementCtx): void {
  // `next build` runs with NODE_ENV=production and placeholder values
  // for everything it must import, because a build has no database and
  // no secrets. It is not an installation, so it is not held to an
  // installation's standards; the checks below are for a process that
  // is about to serve requests.
  const building = process.env.NEXT_PHASE === "phase-production-build";
  // The placeholder is published in .env.example, and this secret does
  // not only sign sessions: it derives the key that encrypts every
  // workspace's model API key (src/core/crypto/secret-box.ts). An
  // installation that went live on the example value would be handing
  // both away. Documentation is not a control, so this is one.
  if (value.NODE_ENV === "production" && !building) {
    // Coolify pre-fills every variable with the compose file's `:?`
    // message as its value, so "set BETTER_AUTH_SECRET" arrives here
    // looking like a choice. It is short enough to fail the length rule
    // too, but the length rule's message would send the operator to the
    // wrong fix.
    if (/^\s*set\s+[A-Z][A-Z0-9_]*\b/.test(value.BETTER_AUTH_SECRET)) {
      ctx.addIssue({
        code: "custom",
        message:
          "BETTER_AUTH_SECRET holds the compose file's placeholder text, not a secret. Coolify fills every variable with the message after `:?` in docker-compose.yml; replace it with `openssl rand -base64 32`, and check the database passwords the same way.",
        path: ["BETTER_AUTH_SECRET"],
      });
    } else if (
      value.BETTER_AUTH_SECRET === PLACEHOLDER_SECRET ||
      value.BETTER_AUTH_SECRET.length < 32
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "BETTER_AUTH_SECRET must be at least 32 characters and not the value from .env.example in production. Generate one with: openssl rand -base64 32",
        path: ["BETTER_AUTH_SECRET"],
      });
    }
    if (!value.BETTER_AUTH_URL.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        message:
          "BETTER_AUTH_URL must be an https:// address in production; passkeys and secure cookies are bound to it",
        path: ["BETTER_AUTH_URL"],
      });
    }
  }
  if (value.LLM_PROVIDER === "mistral" && !value.MISTRAL_API_KEY) {
    ctx.addIssue({
      code: "custom",
      message: "LLM_PROVIDER=mistral requires MISTRAL_API_KEY",
      path: ["LLM_PROVIDER"],
    });
  }
  // Half a provider is a connect button that fails at the provider's
  // door, which the rider would take for Kadence being broken. Refused
  // at start instead, naming the missing half.
  for (const [id, secret] of [
    ["WAHOO_CLIENT_ID", "WAHOO_CLIENT_SECRET"],
    ["GARMIN_CLIENT_ID", "GARMIN_CLIENT_SECRET"],
    ["POLAR_CLIENT_ID", "POLAR_CLIENT_SECRET"],
  ] as const) {
    if (Boolean(value[id]) !== Boolean(value[secret])) {
      ctx.addIssue({
        code: "custom",
        message: `${id} and ${secret} go together: set both to connect, or neither`,
        path: [value[id] ? secret : id],
      });
    }
  }
  if (value.WAHOO_WEBHOOK_TOKEN && !value.WAHOO_CLIENT_ID) {
    ctx.addIssue({
      code: "custom",
      message: "WAHOO_WEBHOOK_TOKEN does nothing without WAHOO_CLIENT_ID and WAHOO_CLIENT_SECRET",
      path: ["WAHOO_WEBHOOK_TOKEN"],
    });
  }
  if (Boolean(value.PUSH_PUBLIC_KEY) !== Boolean(value.PUSH_PRIVATE_KEY)) {
    ctx.addIssue({
      code: "custom",
      message:
        "PUSH_PUBLIC_KEY and PUSH_PRIVATE_KEY go together: set both to send reminders, or neither",
      path: [value.PUSH_PUBLIC_KEY ? "PUSH_PRIVATE_KEY" : "PUSH_PUBLIC_KEY"],
    });
  }
  // Half a mail setup fails at the provider's door; refused at start.
  const mail = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"] as const;
  const mailSet = mail.filter((key) => value[key] !== undefined);
  if (mailSet.length > 0 && mailSet.length < mail.length) {
    const missing = mail.filter((key) => value[key] === undefined);
    ctx.addIssue({
      code: "custom",
      message: `${mail.join(", ")} go together: set all five to send mail, or none. Missing: ${missing.join(", ")}`,
      path: [missing[0]!],
    });
  }
  // Door 2 confirms a person's address before anything else, which takes
  // mail; without it nobody who signed up could ever get past /verify.
  if (value.SIGNUP === "individuals" && mailSet.length < mail.length) {
    ctx.addIssue({
      code: "custom",
      message:
        "SIGNUP=individuals needs mail: a person who creates their own workspace confirms their address first (docs/adr/0088). Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and MAIL_FROM, or choose SIGNUP=closed",
      path: ["SIGNUP"],
    });
  }
  // Billing reminds an owner by mail before a trial or a payment runs out
  // and when the workspace has become read-only (docs/adr/0090); without
  // mail the first they would hear of it is a workspace that will not save.
  if (value.BILLING === "on" && mailSet.length < mail.length) {
    ctx.addIssue({
      code: "custom",
      message:
        "BILLING=on needs mail: the owners are reminded by mail before a trial or a payment runs out (docs/adr/0090). Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and MAIL_FROM, or choose BILLING=off",
      path: ["BILLING"],
    });
  }
  // Files in an object store need every one of the five; half a store is
  // an upload that fails at the bucket's door. Refused at start instead.
  const files = [
    "S3_FILES_ENDPOINT",
    "S3_FILES_REGION",
    "S3_FILES_BUCKET",
    "S3_FILES_ACCESS_KEY",
    "S3_FILES_SECRET_KEY",
  ] as const;
  const filesSet = files.filter((key) => value[key] !== undefined);
  if (filesSet.length > 0 && filesSet.length < files.length) {
    const missing = files.filter((key) => value[key] === undefined);
    ctx.addIssue({
      code: "custom",
      message: `${files.join(", ")} go together: set all five for FILES_STORAGE=s3, or none. Missing: ${missing.join(", ")}`,
      path: [missing[0]!],
    });
  }
  if (value.FILES_STORAGE === "s3" && filesSet.length === 0) {
    ctx.addIssue({
      code: "custom",
      message:
        "FILES_STORAGE=s3 needs S3_FILES_ENDPOINT, S3_FILES_REGION, S3_FILES_BUCKET, S3_FILES_ACCESS_KEY and S3_FILES_SECRET_KEY",
      path: ["FILES_STORAGE"],
    });
  }
  if (value.POLAR_WEBHOOK_SECRET && !value.POLAR_CLIENT_ID) {
    ctx.addIssue({
      code: "custom",
      message: "POLAR_WEBHOOK_SECRET does nothing without POLAR_CLIENT_ID and POLAR_CLIENT_SECRET",
      path: ["POLAR_WEBHOOK_SECRET"],
    });
  }
}
