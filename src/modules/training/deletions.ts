import { and, eq } from "drizzle-orm";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { plannedSessionDeletions, riders, type PlannedSessionRow } from "@/core/db/schema";
import type { AppTransaction, OrgContext } from "@/core/db/tenant";
import { remindersOn } from "@/core/features";
import { PLAN_DAYS, planWindow } from "@/modules/push/due";

/**
 * A deleted session the rider should hear about (docs/adr/0060, backlog
 * P2-12). A rider's "Planen er ændret" reminder is about a session in the
 * next seven days changed by somebody else; a session somebody else deleted
 * is a change too, and leaves no row to read. So, as a session is deleted,
 * its day and title are written down for seven days
 * (`planned_session_deletions`, drizzle/0035), in the deleter's own name,
 * and the reminder reads them as the rider.
 *
 * Only what a reminder could tell: a session not yet ridden, from today
 * through the seventh day (the week a reminder looks at, and the day it
 * reaches by the morning after a night's quiet hours), deleted by somebody
 * other than the rider, on an installation with reminders. Nothing else is
 * kept.
 */
export async function recordDeletionsIn(
  tx: AppTransaction,
  ctx: OrgContext,
  rows: readonly PlannedSessionRow[],
  today: string = todayInCopenhagen(),
): Promise<void> {
  if (!remindersOn()) return;
  const last = addDaysIso(today, PLAN_DAYS);
  const upcoming = rows.filter((r) => !r.activityId && r.onDate >= today && r.onDate <= last);
  if (upcoming.length === 0) return;
  // The rider deleting their own session knows.
  const own = await tx
    .select({ id: riders.id })
    .from(riders)
    .where(and(eq(riders.orgId, ctx.orgId), eq(riders.userId, ctx.userId)));
  const mine = new Set(own.map((r) => r.id));
  const told = upcoming.filter((r) => !mine.has(r.riderId));
  if (told.length === 0) return;
  await tx.insert(plannedSessionDeletions).values(
    told.map((r) => ({
      orgId: ctx.orgId,
      riderId: r.riderId,
      onDate: r.onDate,
      title: r.title,
      deletedBy: ctx.userId,
    })),
  );
}

/**
 * A session moved out of the rider's next days is gone from them as much
 * as a deleted one, and the moved row is no longer in the week a reminder
 * reads; so it is written down the same way. Moved within the days, the
 * change itself is what the reminder tells.
 */
export async function recordMoveIn(
  tx: AppTransaction,
  ctx: OrgContext,
  row: PlannedSessionRow,
  to: string,
  today: string = todayInCopenhagen(),
): Promise<void> {
  const week = planWindow(today);
  if (to >= week.from && to <= week.to) return;
  await recordDeletionsIn(tx, ctx, [row], today);
}
