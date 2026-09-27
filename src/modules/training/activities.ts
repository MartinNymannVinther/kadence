import { and, asc, eq, getTableColumns, gte, inArray, lte, notExists, sql } from "drizzle-orm";
import { activities, comments, plannedSessions, type ActivityRow } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";

/**
 * Activities for the calendar: the ones no planned session claims (the
 * claimed ones travel with their session), and one activity in full for
 * its page. `streams` is only read where a chart needs it.
 */

const { streams, ...WITHOUT_STREAMS } = getTableColumns(activities);

export type CalendarActivity = Omit<ActivityRow, "streams"> & { commentCount: number };

export async function listUnplannedIn(
  tx: AppTransaction,
  range: { from: string; to: string; riderIds?: string[] },
): Promise<CalendarActivity[]> {
  const where = [
    gte(activities.onDate, range.from),
    lte(activities.onDate, range.to),
    notExists(
      tx
        .select({ one: sql`1` })
        .from(plannedSessions)
        .where(eq(plannedSessions.activityId, activities.id)),
    ),
  ];
  if (range.riderIds) {
    if (range.riderIds.length === 0) return [];
    where.push(inArray(activities.riderId, range.riderIds));
  }
  const rows = await tx
    .select({
      ...WITHOUT_STREAMS,
      commentCount: sql<number>`(select count(*)::int from ${comments} c where c.activity_id = ${activities.id})`,
    })
    .from(activities)
    .where(and(...where))
    .orderBy(asc(activities.startedAt));
  return rows.map((r) => ({ ...r, commentCount: Number(r.commentCount) }));
}

export async function listUnplanned(
  ctx: OrgContext,
  range: { from: string; to: string; riderIds?: string[] },
) {
  return withOrgContext(ctx, (tx) => listUnplannedIn(tx, range));
}

export async function getActivity(ctx: OrgContext, id: string): Promise<ActivityRow | null> {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx.select().from(activities).where(eq(activities.id, id));
    return row ?? null;
  });
}
