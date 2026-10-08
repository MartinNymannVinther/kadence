import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { addDaysIso, mondayOf, todayInCopenhagen } from "@/core/dates";
import { auditLog, checkins, memberships, plannedSessions, riders } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { isCoachRole, roleIn } from "@/modules/team/access";
import { PLANNING_TABLES, pilotWeeks, type PilotWeek } from "./pilot-numbers";

/**
 * The team's three numbers for its coaches (docs/adr/0066), the last
 * PILOT_WEEKS weeks with this one first. Read as the coach, under the
 * ordinary policies: the coaches already read the team's riders, check-ins,
 * sessions, members and audit log (drizzle/0003), so no new way into the
 * data is needed. Each read takes only what the numbers need — a check-in
 * is a rider and a day, an audit row is who, which table and when, never
 * what was written — and the arithmetic is the pure pilot-numbers.ts.
 */

export const PILOT_WEEKS = 8;

/** Null for anyone who does not coach the team. */
export async function getPilotWeeks(
  ctx: OrgContext,
  options: { today?: string } = {},
): Promise<PilotWeek[] | null> {
  const today = options.today ?? todayInCopenhagen();
  const from = addDaysIso(mondayOf(today), -7 * (PILOT_WEEKS - 1));
  return withOrgContext(ctx, async (tx) => {
    if (!isCoachRole(await roleIn(tx, ctx))) return null;

    const riderRows = await tx
      .select({ id: riders.id, createdAt: riders.createdAt, archived: riders.archived })
      .from(riders)
      .where(eq(riders.orgId, ctx.orgId));
    const checkinRows = await tx
      .select({ riderId: checkins.riderId, onDate: checkins.onDate })
      .from(checkins)
      .where(
        and(eq(checkins.orgId, ctx.orgId), gte(checkins.onDate, from), lte(checkins.onDate, today)),
      );
    const sessionRows = await tx
      .select({
        riderId: plannedSessions.riderId,
        onDate: plannedSessions.onDate,
        activityId: plannedSessions.activityId,
      })
      .from(plannedSessions)
      .where(
        and(
          eq(plannedSessions.orgId, ctx.orgId),
          gte(plannedSessions.onDate, from),
          lte(plannedSessions.onDate, addDaysIso(today, -1)),
        ),
      );
    const coachIds = (
      await tx
        .select({ userId: memberships.userId })
        .from(memberships)
        .where(
          and(
            eq(memberships.organizationId, ctx.orgId),
            inArray(memberships.role, ["owner", "admin"]),
          ),
        )
    ).map((m) => m.userId);
    // A day before the first Monday in UTC is before its Copenhagen
    // midnight in summer and winter alike; the pure part keeps the days.
    const since = new Date(`${addDaysIso(from, -1)}T00:00:00Z`);
    const edits = await tx
      .select({
        actorUserId: auditLog.actorUserId,
        entityType: auditLog.entityType,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.orgId, ctx.orgId),
          gte(auditLog.createdAt, since),
          inArray(auditLog.entityType, [...PLANNING_TABLES]),
          inArray(auditLog.actorUserId, coachIds.length > 0 ? coachIds : [""]),
        ),
      );

    return pilotWeeks(today, PILOT_WEEKS, {
      riders: riderRows,
      checkins: checkinRows,
      sessions: sessionRows,
      edits,
      coachIds,
    });
  });
}
