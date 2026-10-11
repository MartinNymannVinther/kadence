import { eq } from "drizzle-orm";
import { auth } from "@/core/auth/auth";
import { authDb } from "@/core/db/client";
import { users } from "@/core/db/schema";
import { errorName, log, requestIdFrom } from "@/core/log";
import { mailConfigured } from "@/core/mail/mailer";
import type { MailLocale } from "@/core/mail/words";
import { rateLimit } from "@/core/rate-limit";

/**
 * "Bekræft din adresse" under Settings → Sikkerhed (docs/adr/0086): a
 * link by e-mail to Better Auth's own confirmation, which marks the
 * address as the person's. Nothing requires it yet; S-08 asks for it first
 * from a person who signs up alone. Three asks an hour, per person.
 */

const HOUR = 60 * 60 * 1000;
const PER_HOUR = 3;

/** Whether the person's address is confirmed, from the row rather than the session's cookie. */
export async function addressVerified(userId: string): Promise<boolean> {
  const [row] = await authDb
    .select({ verified: users.emailVerified })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.verified ?? false;
}

export type VerifyAsk = "sent" | "verified" | "rateLimited" | "off" | "failed";

/** Where the link comes back to: the security page, in the language it was asked from. */
export function verifyCallback(locale: MailLocale): string {
  return `${locale === "en" ? "/en" : ""}/settings/security?verified=1`;
}

export async function askForVerification(
  headers: Headers,
  user: { id: string; email: string },
  locale: MailLocale,
): Promise<VerifyAsk> {
  if (!mailConfigured()) return "off";
  if (await addressVerified(user.id)) return "verified";
  if (!(await rateLimit(`verify-ask:${user.id}`, PER_HOUR, HOUR)).allowed) return "rateLimited";
  try {
    await auth.api.sendVerificationEmail({
      body: { email: user.email, callbackURL: verifyCallback(locale) },
      headers,
    });
    return "sent";
  } catch (error) {
    await log.error("auth: confirmation mail not asked for", {
      requestId: requestIdFrom(headers),
      error: errorName(error),
    });
    return "failed";
  }
}
