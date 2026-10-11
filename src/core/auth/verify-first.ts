import { eq } from "drizzle-orm";
import { cache } from "react";
import { authDb } from "@/core/db/client";
import { users } from "@/core/db/schema";

/**
 * Door 2's first rule (docs/adr/0088): a person who created their own
 * workspace confirms their address before anything else. Until they do,
 * the app's pages and Rulle send them to /verify, and `getOrgContext`
 * answers no team, so no service, action or route acts for them either.
 *
 * Only accounts made through door 2 carry `self_signup` (set by the
 * sign-up hook, never from a request). A coach, a rider or a parent who
 * came in by a team's invitation, an approved application or the first
 * account came in through a link to their own address, or before door 2
 * existed, and is not asked.
 */

/** The address as the database has it now: the session's cookie may be up to five minutes behind. */
const verifiedNow = cache(async (userId: string): Promise<boolean> => {
  const [row] = await authDb
    .select({ verified: users.emailVerified })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.verified ?? false;
});

export type VerifyFirstUser = { id: string; emailVerified?: boolean; selfSignup?: unknown };

/** Whether this person must confirm their address before they may use Kadence. */
export async function mustVerifyFirst(user: VerifyFirstUser): Promise<boolean> {
  if (user.selfSignup !== true || user.emailVerified) return false;
  return !(await verifiedNow(user.id));
}

/** The one page an unconfirmed door-2 account may see. */
export const VERIFY_PATH = "/verify";
