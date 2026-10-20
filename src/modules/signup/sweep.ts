import { and, eq, lt, sql } from "drizzle-orm";
import { authDb } from "@/core/db/client";
import { users } from "@/core/db/schema";
import { UNVERIFIED_DAYS } from "@/core/auth/verify-days";
import { errorName, log } from "@/core/log";

export { UNVERIFIED_DAYS };

/**
 * An account a person created through door 2 and never confirmed is
 * deleted after thirty days (docs/adr/0088, amended 12 October 2026: it
 * was seven while the account was locked from the start; now the person
 * uses it for a week before it locks): the workspace, then the
 * account, as "Slet min konto og alt om mig" takes them, and every audit
 * row about either, leaving one line, `signup.expired`, with the account's
 * id and nothing else. Done in the database by
 * `delete_unverified_signup()` (drizzle/0053) on the auth role, which
 * refuses — by doing nothing — anything that is not a door-2 account,
 * unconfirmed, older than thirty days by the database's clock and nothing
 * but its own workspace: an account on a team, a confirmed one, an
 * owner's or one a few days old cannot be reached.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Accounts looked at per run; the next run takes the rest. */
const PER_RUN = 500;

/**
 * Deletes the door-2 accounts unconfirmed for thirty days before `now`,
 * and answers how many went. `now` is for a test's clock; the database
 * checks the thirty days again against its own.
 */
export async function sweepUnverifiedSignups(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - UNVERIFIED_DAYS * DAY_MS);
  const due = await authDb
    .select({ id: users.id })
    .from(users)
    .where(
      and(eq(users.selfSignup, true), eq(users.emailVerified, false), lt(users.createdAt, cutoff)),
    )
    .orderBy(users.createdAt)
    .limit(PER_RUN);
  let deleted = 0;
  for (const { id } of due) {
    try {
      const result = await authDb.execute<{ deleted: boolean }>(
        sql`select delete_unverified_signup(${id}) as deleted`,
      );
      if (result.rows[0]?.deleted) deleted += 1;
    } catch (error) {
      // One account that cannot go does not stop the others.
      await log.error("signup: sweep failed", { error: errorName(error) });
    }
  }
  return deleted;
}
