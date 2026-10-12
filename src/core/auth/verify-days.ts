/**
 * Door 2's two clocks (docs/adr/0088, amended 12 October 2026). Pure, so
 * the sign-up form, the stripe and the tests share them.
 *
 * - A person who created their own workspace is in at once, and has
 *   `VERIFY_GRACE_DAYS` to confirm the address; after that /verify is all
 *   they get until they do (verify-first.ts).
 * - An account still unconfirmed after `UNVERIFIED_DAYS` is deleted by the
 *   daily sweep (src/modules/signup/sweep.ts), and the database refuses
 *   anything younger (drizzle/0053).
 */

export const VERIFY_GRACE_DAYS = 7;
export const UNVERIFIED_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The moment the grace ends for an account created at `createdAt`. */
export function verifyDeadline(createdAt: Date): Date {
  return new Date(createdAt.getTime() + VERIFY_GRACE_DAYS * DAY_MS);
}

/** Whether an unconfirmed account created at `createdAt` is past its grace at `now`. */
export function pastGrace(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= verifyDeadline(createdAt).getTime();
}
