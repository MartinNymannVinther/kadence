import { createHmac } from "node:crypto";
import { z } from "zod";
import { auth } from "@/core/auth/auth";
import { env } from "@/core/env";
import { errorName, log, requestIdFrom } from "@/core/log";
import { mailConfigured } from "@/core/mail/mailer";
import type { MailLocale } from "@/core/mail/words";
import { callerKey, rateLimit } from "@/core/rate-limit";

/**
 * "Glemt adgangskode?" (docs/adr/0086): a link by e-mail to the same
 * /reset-password a coach's link opens (ADR 0032), which works once and
 * within the hour and signs the person out everywhere else.
 *
 * The answer is the same whether the address has an account or not, and
 * takes as long: Better Auth answers an unknown address after a dummy
 * lookup, and the mail itself goes in the background (mail-hooks.ts). Five
 * asks an hour from one address on the network and five for one e-mail
 * address, counted before Better Auth is asked, so the count says nothing
 * about whether the address exists either. The e-mail address is counted
 * by an HMAC of it, so the counters never hold an address.
 */

const HOUR = 60 * 60 * 1000;
export const FORGOT_PER_HOUR = 5;

export const ForgotInput = z.object({ email: z.email().max(320) });

export type ForgotResult = "sent" | "rateLimited" | "invalid" | "off";

/** The counter's key for an address: an HMAC under the installation's secret, never the address. */
export function addressKey(email: string): string {
  const digest = createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`forgot:${email.trim().toLowerCase()}`)
    .digest("base64url");
  return `forgot-address:${digest}`;
}

export async function requestPasswordLink(
  headers: Headers,
  raw: unknown,
  locale: MailLocale,
): Promise<ForgotResult> {
  if (!mailConfigured()) return "off";
  const parsed = ForgotInput.safeParse(raw);
  if (!parsed.success) return "invalid";
  const email = parsed.data.email.trim().toLowerCase();

  if (
    !(await rateLimit(callerKey(headers, "forgot-ip"), FORGOT_PER_HOUR, HOUR)).allowed ||
    !(await rateLimit(addressKey(email), FORGOT_PER_HOUR, HOUR)).allowed
  )
    return "rateLimited";

  try {
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: locale === "en" ? "/en/reset-password" : "/reset-password" },
      headers,
    });
  } catch (error) {
    // Said in the log, by name, and not to the person: the answer stays the same.
    await log.error("auth: password link not made", {
      requestId: requestIdFrom(headers),
      error: errorName(error),
    });
  }
  return "sent";
}
