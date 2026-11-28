import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { addDaysIso } from "@/core/dates";
import { sessionChangeNotes, sessionChanges } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import {
  changeSummary,
  PATTERN_WEEKS,
  type ChangeFact,
  type ChangePattern,
  type ChangeSummary,
} from "./change-patterns";

/**
 * A rider's moved and skipped sessions, read for the coach (docs/adr/0119):
 * the summary and patterns for the rider's page, the patterns alone for
 * "Planlæg ugen", and the last changes with their words. Plain selects
 * under the caller's policies: a parent reads the changes and never the
 * words, a teammate nothing (drizzle/0064).
 */

export type RecentChange = {
  id: string;
  kind: "moved" | "skipped" | "unskipped";
  fromDate: string;
  toDate: string | null;
  title: string;
  reason: string | null;
  byRole: "rider" | "coach";
  /** The words beside the change; null where there are none or the reader may not read them. */
  note: string | null;
};

const RECENT = 6;

async function factsIn(
  tx: AppTransaction,
  riderIds: string[],
  today: string,
): Promise<(ChangeFact & { riderId: string })[]> {
  if (riderIds.length === 0) return [];
  return tx
    .select({
      riderId: sessionChanges.riderId,
      plannedSessionId: sessionChanges.plannedSessionId,
      kind: sessionChanges.kind,
      fromDate: sessionChanges.fromDate,
      reason: sessionChanges.reason,
      byRole: sessionChanges.byRole,
      changedOn: sql<string>`to_char(${sessionChanges.changedAt} at time zone 'Europe/Copenhagen', 'YYYY-MM-DD')`,
      sport: sessionChanges.sport,
      plannedMinutes: sessionChanges.plannedMinutes,
    })
    .from(sessionChanges)
    .where(
      and(
        inArray(sessionChanges.riderId, riderIds),
        gte(sessionChanges.fromDate, addDaysIso(today, -7 * PATTERN_WEEKS)),
      ),
    );
}

/** The patterns of each rider's changes, for "Planlæg ugen"; riders without any are left out. */
export async function patternsFor(
  ctx: OrgContext,
  riderIds: string[],
  today: string,
): Promise<Record<string, ChangePattern[]>> {
  const facts = await withOrgContext(ctx, (tx) => factsIn(tx, riderIds, today));
  const out: Record<string, ChangePattern[]> = {};
  for (const id of riderIds) {
    const patterns = changeSummary(
      facts.filter((f) => f.riderId === id),
      today,
    ).patterns;
    if (patterns.length > 0) out[id] = patterns;
  }
  return out;
}

/** One rider's changes in the last eight weeks: the summary, and the latest few with their words. */
export async function riderChanges(
  ctx: OrgContext,
  riderId: string,
  today: string,
): Promise<{ summary: ChangeSummary; recent: RecentChange[] }> {
  return withOrgContext(ctx, async (tx) => {
    const facts = await factsIn(tx, [riderId], today);
    const rows = await tx
      .select({
        id: sessionChanges.id,
        kind: sessionChanges.kind,
        fromDate: sessionChanges.fromDate,
        toDate: sessionChanges.toDate,
        title: sessionChanges.title,
        reason: sessionChanges.reason,
        byRole: sessionChanges.byRole,
        note: sessionChangeNotes.note,
      })
      .from(sessionChanges)
      .leftJoin(sessionChangeNotes, eq(sessionChangeNotes.changeId, sessionChanges.id))
      .where(eq(sessionChanges.riderId, riderId))
      .orderBy(desc(sessionChanges.changedAt))
      .limit(RECENT);
    return {
      summary: changeSummary(facts, today),
      recent: rows.map((r) => ({
        ...r,
        kind: r.kind as RecentChange["kind"],
        byRole: r.byRole as RecentChange["byRole"],
        note: r.note ?? null,
      })),
    };
  });
}
