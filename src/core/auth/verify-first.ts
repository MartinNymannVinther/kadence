import { eq } from "drizzle-orm";
import { cache } from "react";
import { authDb } from "@/core/db/client";
import { users } from "@/core/db/schema";
import { pastGrace, verifyDeadline } from "./verify-days";

/**
 * Door 2's first rule (docs/adr/0088, amended 12 October 2026): a person
 * who created their own workspace is in it at once, and confirms their
 * address within a week (`VERIFY_GRACE_DAYS`, verify-days.ts). Until they
 * do, a stripe at the top of every app page says by when, with "Send
 * mailen igen". After the week, the app's pages and Rulle send them to
 * /verify, and `getOrgContext` answers no team, so no service, action or
 * route acts for them either, until the address is confirmed.
 *
 * Only accounts made through door 2 carry `self_signup` (set by the
 * sign-up hook, never from a request). A coach, a rider or a parent who
 * came in by a team's invitation, an approved application or the first
 * account came in through a link to their own address, or before door 2
 * existed, and is not asked.
 */

type Stored = { verified: boolean; createdAt: Date };

/** The account as the database has it now: the session's cookie may be up to five minutes behind. */
const storedNow = cache(async (userId: string): Promise<Stored | null> => {
  const [row] = await authDb
    .select({ verified: users.emailVerified, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
});

export type VerifyFirstUser = { id: string; emailVerified?: boolean; selfSignup?: unknown };

/** A door-2 account still waiting for its address, read from the database; null for anyone else. */
async function waiting(user: VerifyFirstUser): Promise<Stored | null> {
  if (user.selfSignup !== true || user.emailVerified) return null;
  const stored = await storedNow(user.id);
  return stored && !stored.verified ? stored : null;
}

/**
 * When a door-2 account that has not confirmed its address must do so by,
 * while it still may use Kadence: the end of its week. Null for everyone
 * else, and for an account past its week (that one gets /verify).
 */
export async function verifyBy(
  user: VerifyFirstUser,
  now: Date = new Date(),
): Promise<Date | null> {
  const stored = await waiting(user);
  if (!stored || pastGrace(stored.createdAt, now)) return null;
  return verifyDeadline(stored.createdAt);
}

/** Whether this door-2 account has not confirmed its address yet, inside its week or past it. */
export async function awaitingVerification(user: VerifyFirstUser): Promise<boolean> {
  return (await waiting(user)) !== null;
}

/** Whether this person must confirm their address before they may use Kadence: a week has passed. */
export async function mustVerifyFirst(
  user: VerifyFirstUser,
  now: Date = new Date(),
): Promise<boolean> {
  const stored = await waiting(user);
  return stored !== null && pastGrace(stored.createdAt, now);
}

/** The one page an unconfirmed door-2 account may see once its week has passed. */
export const VERIFY_PATH = "/verify";
