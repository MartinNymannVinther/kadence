import { createHmac, timingSafeEqual } from "node:crypto";
import { count, notLike } from "drizzle-orm";
import { invitationAdmits } from "@/core/access/service";
import { teamInvitationAdmits } from "@/core/team/service";
import { authDb } from "@/core/db/client";
import { users } from "@/core/db/schema";
import { env } from "@/core/env";

/**
 * Who may create an account.
 *
 * An Kadence on the open internet with open registration is an Kadence where a
 * stranger can make themselves an organization inside your installation.
 * So registration is closed unless it is deliberately opened, and the
 * default has to be the safe one: a setting you must remember to change
 * before going live is a setting that will be forgotten.
 *
 * The exception is the empty installation. A fresh checkout with no users
 * at all lets the first person through, because otherwise nobody could
 * ever get in and every new installation would start with a chicken-and-egg
 * problem solved by hand-editing the database. The window closes by itself
 * the moment that first account exists.
 */
export type SignupMode = typeof env.SIGNUP;

/** Request-level header the registration flow uses to present its key. */
export const INVITATION_HEADER = "x-kadence-invitation";

/** Header carrying a workspace invitation's id: a colleague joining an existing workspace. */
export const TEAM_INVITATION_HEADER = "x-kadence-team-invitation";

export const DEMO_HEADER = "x-kadence-demo";

/**
 * The demo route creates its throwaway account through the ordinary
 * sign-up endpoint, and that endpoint is public. A header alone therefore
 * proves nothing: anyone can send one, and while DEMO=on a forged
 * `x-kadence-demo: 1` would have walked straight past SIGNUP=closed and
 * created permanent accounts that the demo cleanup never touches, because
 * they were never registered as demos.
 *
 * So the header carries a secret instead of a flag: an HMAC-SHA256 under
 * BETTER_AUTH_SECRET over the day (UTC), never written down and never sent
 * to a browser. The demo service computes it; nobody without the secret
 * can. It used to be drawn at random when the process started, which only
 * the process that drew it knew: a second instance, or the same one after
 * a restart in the middle of a sign-up, would have refused its own demo
 * (docs/adr/0083). Today's and yesterday's are both accepted, so a demo
 * started a moment before midnight still signs up after it. Compared in
 * constant time out of habit rather than need.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

/** The header value for the UTC day `at` falls on. */
function demoNonceFor(at: Date): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`kadence-demo-signup:${at.toISOString().slice(0, 10)}`)
    .digest("base64url");
}

function sameNonce(given: Buffer, expected: string): boolean {
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export function demoSignupHeaderValue(now: Date = new Date()): string {
  return demoNonceFor(now);
}

export function isDemoSignup(value: string | null | undefined, now: Date = new Date()): boolean {
  if (!value) return false;
  const given = Buffer.from(value);
  const today = sameNonce(given, demoNonceFor(now));
  const yesterday = sameNonce(given, demoNonceFor(new Date(now.getTime() - DAY_MS)));
  return today || yesterday;
}

export function signupAllowedFor(mode: SignupMode, existingUsers: number): boolean {
  return mode === "open" || existingUsers === 0;
}

/**
 * Every account the demo makes is at this domain (src/modules/demo): the
 * visitor's and the demo's rider and parent. `.invalid` is reserved
 * (RFC 6761), so no person's real address ends here.
 */
export const DEMO_EMAIL_DOMAIN = "demo.invalid";

export function isDemoEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`));
}

/**
 * The people on the installation: every account but the demo's. A demo
 * opened on an empty installation must not close the door the first real
 * person comes in by, nor make the visitor the installation's owner
 * (backlog P1-09), so neither the door nor the owner counts demo accounts.
 */
export async function countUsers(): Promise<number> {
  const [row] = await authDb
    .select({ total: count() })
    .from(users)
    .where(notLike(users.email, `%@${DEMO_EMAIL_DOMAIN}`));
  return Number(row?.total ?? 0);
}

export type SignupAttempt = {
  /** Address the account would be created for. */
  email?: string | null;
  /** Invitation key presented with the attempt, if any. */
  invitationToken?: string | null;
  /** A workspace invitation's id, when a colleague is joining an existing workspace. */
  teamInvitationId?: string | null;
  /** The demo route creating a throwaway account for a visitor. */
  demo?: boolean;
};

/**
 * The two doors that are opened on purpose: a closed installation still
 * admits an address that holds a valid invitation from the owner (see
 * src/core/access), and an address a workspace has invited to join it
 * (see src/core/team). The key alone is never enough, the address has to
 * be the one it was issued for.
 */
export async function signupAllowed(attempt: SignupAttempt = {}): Promise<boolean> {
  // A demo account is not a person asking to be let in; it is a session
  // that expires. It is admitted only while the installation has asked
  // for demos at all.
  if (attempt.demo && env.DEMO === "on") return true;
  // Skip the count when the answer cannot depend on it.
  if (env.SIGNUP === "open") return true;
  if (signupAllowedFor(env.SIGNUP, await countUsers())) return true;
  if (attempt.invitationToken && attempt.email) {
    return invitationAdmits(attempt.invitationToken, attempt.email);
  }
  if (attempt.teamInvitationId && attempt.email) {
    return teamInvitationAdmits(attempt.teamInvitationId, attempt.email);
  }
  return false;
}
