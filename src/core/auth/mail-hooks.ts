import { recordAuthEvent } from "@/core/audit/events";
import { env } from "@/core/env";
import { mailConfigured, sendMailLater } from "@/core/mail/mailer";
import { resetPasswordMail } from "@/core/mail/templates/reset-password";
import { verifyAddressMail } from "@/core/mail/templates/verify-address";
import { appLink } from "@/core/mail/links";
import { localeOfPath, mailWords } from "@/core/mail/words";
import { rateLimit } from "@/core/rate-limit";

/**
 * Better Auth's two mails (docs/adr/0086), wired only when the
 * installation sends mail. Without SMTP neither is given to Better Auth,
 * so it refuses a password link by e-mail and a confirmation mail exactly
 * as it did before there was mail, and the coach's link (ADR 0032) is the
 * way back in.
 *
 * Both send in the background: Better Auth answers an unknown address as
 * fast as it can, and a known one must not take the SMTP round trip
 * longer, or the time would tell which addresses have an account. Each
 * also counts per person, silently, for a caller that reaches Better
 * Auth's endpoint directly rather than through /forgot-password.
 */

const HOUR = 60 * 60 * 1000;
/** Mails of each kind one person can be sent in an hour, whoever asks. */
const PER_PERSON = 5;

type MailUser = { id: string; email: string };

/** The path Better Auth was told to come back to, carried in its own link; null when there is none. */
export function callbackOf(link: string): string | null {
  try {
    const value = new URL(link).searchParams.get("callbackURL");
    // Only a path on this site; anything else is not ours to follow.
    return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
  } catch {
    return null;
  }
}

/** The page /reset-password, in the language the request came from, with the token. */
export function resetLink(betterAuthUrl: string, token: string): string {
  const locale = localeOfPath(callbackOf(betterAuthUrl));
  return appLink("/reset-password", locale, { token, via: "mail" });
}

/** Better Auth's confirmation endpoint on the installation's address, coming back to the security page. */
export function verifyLink(betterAuthUrl: string, token: string): string {
  const back = callbackOf(betterAuthUrl);
  const locale = localeOfPath(back);
  const url = new URL("/api/auth/verify-email", env.BETTER_AUTH_URL);
  url.searchParams.set("token", token);
  url.searchParams.set("callbackURL", back ?? (locale === "en" ? "/en" : "/"));
  return url.toString();
}

async function allowed(kind: "reset" | "verify", user: MailUser): Promise<boolean> {
  return (await rateLimit(`mail-${kind}:${user.id}`, PER_PERSON, HOUR)).allowed;
}

async function sendResetPassword(data: { user: MailUser; url: string; token: string }) {
  if (!(await allowed("reset", data.user))) return;
  const locale = localeOfPath(callbackOf(data.url));
  const mail = resetPasswordMail(mailWords(locale), { url: resetLink(data.url, data.token) });
  sendMailLater({ to: data.user.email, ...mail });
}

async function sendVerificationEmail(data: { user: MailUser; url: string; token: string }) {
  if (!(await allowed("verify", data.user))) return;
  const locale = localeOfPath(callbackOf(data.url));
  const mail = verifyAddressMail(mailWords(locale), { url: verifyLink(data.url, data.token) });
  sendMailLater({ to: data.user.email, ...mail });
}

/** `emailAndPassword` options for a password link by e-mail; none without mail. */
export function resetByMail(): { sendResetPassword?: typeof sendResetPassword } {
  return mailConfigured() ? { sendResetPassword } : {};
}

/**
 * Better Auth's `emailVerification`, without mail none at all. A
 * confirmation is asked for, never sent on sign-up or required to sign
 * in: S-08 makes it the first step for a person who signs up alone.
 */
export function verificationByMail() {
  if (!mailConfigured()) return {};
  return {
    emailVerification: {
      sendVerificationEmail,
      sendOnSignUp: false,
      sendOnSignIn: false,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
      afterEmailVerification: async (user: { id: string }) => {
        await recordAuthEvent({
          action: "auth.email_verified",
          actorUserId: user.id,
          entityType: "users",
          entityId: user.id,
        });
      },
    },
  };
}
