import { eq } from "drizzle-orm";
import { Refused } from "@/core/action";
import {
  plannedSessions,
  riders,
  sessionChangeNotes,
  sessionChanges,
  type ChangeKind,
  type ChangeReason,
  type PlannedSessionRow,
} from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { readStructure } from "@/modules/workouts/structure";
import { recordMoveIn } from "./deletions";
import { createSessionIn, loadOwn } from "./sessions";
import type { SessionInputT } from "./vocabulary";

/**
 * Moving a planned session to another day, skipping it, and taking a skip
 * back (docs/adr/0117). Each is written down in `session_changes` with
 * the reason picked in one tap — or none — and who did it, so a rider's
 * changes can show their patterns. The words a person adds go beside it
 * in `session_change_notes`, which a parent does not read.
 *
 * A skipped session stays in the calendar, grey, with its reason, and
 * counts in no planned hours. Moving it, or saying it was done, brings it
 * back. A session that has a ride is done and is not skipped.
 */

export type ChangeWhy = { reason?: ChangeReason | null; note?: string };

async function recordChangeIn(
  tx: AppTransaction,
  ctx: OrgContext,
  row: PlannedSessionRow,
  kind: ChangeKind,
  toDate: string | null,
  why: ChangeWhy,
): Promise<void> {
  const [rider] = await tx
    .select({ userId: riders.userId })
    .from(riders)
    .where(eq(riders.id, row.riderId));
  const [change] = await tx
    .insert(sessionChanges)
    .values({
      orgId: ctx.orgId,
      riderId: row.riderId,
      plannedSessionId: row.id,
      kind,
      fromDate: row.onDate,
      toDate,
      sport: row.sport,
      title: row.title,
      plannedMinutes: row.plannedMinutes,
      reason: why.reason ?? null,
      byRole: rider?.userId === ctx.userId ? "rider" : "coach",
      changedBy: ctx.userId,
    })
    .returning({ id: sessionChanges.id });
  const note = why.note?.trim();
  if (change && note)
    await tx
      .insert(sessionChangeNotes)
      .values({ changeId: change.id, orgId: ctx.orgId, riderId: row.riderId, note });
}

/** Moving a session to another day, or copying it — to the same rider or another. */
export async function moveSession(
  ctx: OrgContext,
  id: string,
  onDate: string,
  copy = false,
  toRiderId?: string,
  why: ChangeWhy = {},
) {
  return withOrgContext(ctx, async (tx) => {
    const row = await loadOwn(tx, ctx, id);
    if (!copy) {
      if (row.onDate === onDate) return { id };
      await tx
        .update(plannedSessions)
        .set({ onDate, activityId: null, skippedAt: null, skipReason: null })
        .where(eq(plannedSessions.id, id));
      await recordMoveIn(tx, ctx, row, onDate);
      await recordChangeIn(tx, ctx, row, "moved", onDate, why);
      return { id };
    }
    return createSessionIn(tx, ctx, {
      riderId: toRiderId ?? row.riderId,
      onDate,
      sport: row.sport as SessionInputT["sport"],
      title: row.title,
      description: row.description,
      structure: readStructure(row.structure, row.sport as SessionInputT["sport"]),
      plannedMinutes: row.plannedMinutes,
      plannedKm: row.plannedKm,
      templateId: row.templateId,
      startTime: row.startTime,
      meetingPlace: row.meetingPlace,
    });
  });
}

/** "Spring over": the session stays on its day, grey, with the reason. */
export async function skipSession(ctx: OrgContext, id: string, why: ChangeWhy = {}) {
  return withOrgContext(ctx, async (tx) => {
    const row = await loadOwn(tx, ctx, id);
    if (row.activityId !== null) throw new Refused("invalid", "done");
    if (row.skippedAt !== null) return { id };
    await tx
      .update(plannedSessions)
      .set({ skippedAt: new Date(), skipReason: why.reason ?? null })
      .where(eq(plannedSessions.id, id));
    await recordChangeIn(tx, ctx, row, "skipped", null, why);
    return { id };
  });
}

/** "Fortryd": the session is planned again, and the change says so. */
export async function unskipSession(ctx: OrgContext, id: string) {
  return withOrgContext(ctx, async (tx) => {
    const row = await loadOwn(tx, ctx, id);
    if (row.skippedAt === null) return { id };
    await tx
      .update(plannedSessions)
      .set({ skippedAt: null, skipReason: null })
      .where(eq(plannedSessions.id, id));
    await recordChangeIn(tx, ctx, row, "unskipped", null, {});
    return { id };
  });
}
