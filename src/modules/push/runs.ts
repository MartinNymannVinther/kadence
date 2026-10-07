import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { pushRuns, pushSubscriptions } from "@/core/db/schema";
import type { AppTransaction } from "@/core/db/tenant";
import type { Mark, SubscriptionState } from "./due";

/**
 * What the reminder run has told each subscription (docs/adr/0060,
 * drizzle/0036): the marks that keep a reminder from going out twice,
 * in `push_runs`, apart from the subscription so that writing them does
 * not write the audit trail. Every function runs as the subscription's
 * owner, and the table's policy lets nobody else read or write a row.
 */

/** A subscription and what has been told it: what the job decides from and `latest` reads back. */
export type Told = SubscriptionState & {
  id: string;
  endpoint: string;
  /** When the last reminder went out; null until one has. */
  toldAt: Date | null;
};

/** A subscription that has been told something. */
export type ToldOnce = Told & { toldAt: Date };

const columns = {
  id: pushSubscriptions.id,
  endpoint: pushSubscriptions.endpoint,
  kinds: pushSubscriptions.kinds,
  toldUpTo: pushRuns.toldUpTo,
  checkinRemindedOn: pushRuns.checkinRemindedOn,
  weekToldOn: pushRuns.weekToldOn,
  toldAt: pushRuns.toldAt,
};

/**
 * Makes the run's row for each of these subscriptions that has none.
 * Nothing that happened before a subscription was made is told, so it
 * starts there.
 */
async function ensureRuns(tx: AppTransaction, ids: readonly string[]): Promise<void> {
  const missing = await tx
    .select({
      id: pushSubscriptions.id,
      orgId: pushSubscriptions.orgId,
      userId: pushSubscriptions.userId,
      createdAt: pushSubscriptions.createdAt,
    })
    .from(pushSubscriptions)
    .leftJoin(pushRuns, eq(pushRuns.subscriptionId, pushSubscriptions.id))
    .where(and(inArray(pushSubscriptions.id, [...ids]), isNull(pushRuns.subscriptionId)));
  if (missing.length === 0) return;
  await tx
    .insert(pushRuns)
    .values(
      missing.map((s) => ({
        subscriptionId: s.id,
        orgId: s.orgId,
        userId: s.userId,
        toldUpTo: s.createdAt,
      })),
    )
    .onConflictDoNothing();
}

/** These subscriptions, with what has been told them, made ready for the run. */
export async function toldFor(tx: AppTransaction, ids: readonly string[]): Promise<Told[]> {
  if (ids.length === 0) return [];
  await ensureRuns(tx, ids);
  return tx
    .select(columns)
    .from(pushSubscriptions)
    .innerJoin(pushRuns, eq(pushRuns.subscriptionId, pushSubscriptions.id))
    .where(inArray(pushSubscriptions.id, [...ids]));
}

/** The person's subscriptions on the active team that have been told something. */
export async function toldMine(tx: AppTransaction): Promise<ToldOnce[]> {
  const rows = await tx
    .select(columns)
    .from(pushSubscriptions)
    .innerJoin(pushRuns, eq(pushRuns.subscriptionId, pushSubscriptions.id));
  return rows.flatMap((row) => (row.toldAt ? [{ ...row, toldAt: row.toldAt }] : []));
}

const markValues = (mark: Mark) =>
  mark.slot === "news" || mark.slot === "wellbeing"
    ? { toldUpTo: mark.toldUpTo }
    : mark.slot === "checkin"
      ? { checkinRemindedOn: mark.checkinRemindedOn }
      : { weekToldOn: mark.weekToldOn };

/** Written only if nobody has written it since the row was read. */
function unchanged(row: Told, mark: Mark) {
  if (mark.slot === "news" || mark.slot === "wellbeing")
    return sql`date_trunc('milliseconds', ${pushRuns.toldUpTo}) = ${row.toldUpTo}`;
  if (mark.slot === "checkin")
    return sql`${pushRuns.checkinRemindedOn} is distinct from ${mark.checkinRemindedOn}`;
  return sql`${pushRuns.weekToldOn} is distinct from ${mark.weekToldOn}`;
}

/**
 * Writes the reminder down before it is sent, with `told_at` the moment
 * it goes out (see `lastTold` in due.ts). False when another run wrote it
 * first, so that run sends it and this one does not.
 */
export async function markTold(
  tx: AppTransaction,
  row: Told,
  mark: Mark,
  now: Date,
): Promise<boolean> {
  const written = await tx
    .update(pushRuns)
    .set({ ...markValues(mark), toldAt: now })
    .where(and(eq(pushRuns.subscriptionId, row.id), unchanged(row, mark)))
    .returning({ id: pushRuns.subscriptionId });
  return written.length === 1;
}

/** The reminder could not go out this time: the mark goes back for the next run. */
export async function unmarkTold(tx: AppTransaction, row: Told, mark: Mark): Promise<void> {
  const previous =
    mark.slot === "news" || mark.slot === "wellbeing"
      ? { toldUpTo: row.toldUpTo }
      : mark.slot === "checkin"
        ? { checkinRemindedOn: row.checkinRemindedOn }
        : { weekToldOn: row.weekToldOn };
  await tx.update(pushRuns).set(previous).where(eq(pushRuns.subscriptionId, row.id));
}
