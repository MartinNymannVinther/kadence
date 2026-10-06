import { and, desc, eq, gt, isNotNull, isNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { activities, checkins, comments, plannedSessions, users } from "@/core/db/schema";
import type { AppTransaction, OrgContext } from "@/core/db/tenant";
import type { Me } from "@/modules/team/access";
import { planWindow, type Facts } from "./due";
import { newestRedCheckin } from "./wellbeing";

/**
 * What a reminder is about, read as the person it is for (docs/adr/0060).
 * Every query here runs inside the person's own `withOrgContext`, so the
 * policies decide what they can see: a rider their own sessions, a coach
 * the team's, a parent their child's while the child shares training. A
 * reminder can never be about something its reader could not open. A
 * rider in the red zone is read in wellbeing.ts, for coaches only.
 */

export type Range = { after: Date; upTo: Date };

/** A comment written by a coach (an owner or admin of the team). */
const byCoach = sql`exists (
  select 1 from memberships m
  where m.organization_id = ${comments.orgId}
    and m.user_id = ${comments.authorId}
    and m.role in ('owner', 'admin')
)`;

/**
 * Comments by someone else, in the range. A coach hears from riders and
 * parents, not from the other coaches — except on the coach's own
 * sessions, when the coach also rides.
 */
function commentConditions(ctx: OrgContext, me: Me, range: Range): SQL | undefined {
  const conditions = [
    eq(comments.orgId, ctx.orgId),
    gt(comments.createdAt, range.after),
    lte(comments.createdAt, range.upTo),
    isNotNull(comments.authorId),
    ne(comments.authorId, ctx.userId),
  ];
  if (me.isCoach) {
    const notByCoach = sql`not ${byCoach}`;
    conditions.push(
      me.rider ? (or(eq(comments.riderId, me.rider.id), notByCoach) as SQL) : notByCoach,
    );
  }
  return and(...conditions);
}

export type CommentNews = {
  at: Date;
  riderId: string;
  plannedSessionId: string | null;
  activityId: string | null;
  onDate: string | null;
  sessionTitle: string | null;
  activityTitle: string | null;
  authorName: string | null;
};

/** The newest such comment, with what it is on and who wrote it. */
export async function newestComment(
  tx: AppTransaction,
  ctx: OrgContext,
  me: Me,
  range: Range,
): Promise<CommentNews | null> {
  const [row] = await tx
    .select({
      at: comments.createdAt,
      riderId: comments.riderId,
      plannedSessionId: comments.plannedSessionId,
      activityId: comments.activityId,
      onDate: comments.onDate,
      sessionTitle: plannedSessions.title,
      activityTitle: activities.title,
      authorName: users.name,
    })
    .from(comments)
    .leftJoin(plannedSessions, eq(plannedSessions.id, comments.plannedSessionId))
    .leftJoin(activities, eq(activities.id, comments.activityId))
    .leftJoin(users, eq(users.id, comments.authorId))
    .where(commentConditions(ctx, me, range))
    .orderBy(desc(comments.createdAt))
    .limit(1);
  return row ?? null;
}

/**
 * When a session in the rider's next seven days was last laid or changed
 * by someone else. Kadence keeps who laid a session, not who changed it
 * last, so "someone else" is "laid by someone else"; a session already
 * ridden is done, and matching a ride to it is no change to the plan.
 */
export async function newestPlanChange(
  tx: AppTransaction,
  ctx: OrgContext,
  riderId: string,
  range: Range,
  today: string,
): Promise<Date | null> {
  const days = planWindow(today);
  const [row] = await tx
    .select({
      at: sql<Date | null>`max(${plannedSessions.updatedAt})`.mapWith(plannedSessions.updatedAt),
    })
    .from(plannedSessions)
    .where(
      and(
        eq(plannedSessions.orgId, ctx.orgId),
        eq(plannedSessions.riderId, riderId),
        sql`${plannedSessions.onDate} between ${days.from} and ${days.to}`,
        isNull(plannedSessions.activityId),
        sql`${plannedSessions.createdBy} is distinct from ${ctx.userId}`,
        gt(plannedSessions.updatedAt, range.after),
        lte(plannedSessions.updatedAt, range.upTo),
      ),
    );
  return row?.at ?? null;
}

async function checkedIn(tx: AppTransaction, riderId: string, today: string): Promise<boolean> {
  const [row] = await tx
    .select({ id: checkins.id })
    .from(checkins)
    .where(and(eq(checkins.riderId, riderId), eq(checkins.onDate, today)))
    .limit(1);
  return Boolean(row);
}

/** The children a parent can see: confirmed, and their row readable. */
export function visibleChildren(me: Me): string[] {
  return me.children.filter((c) => c.confirmed && c.name).map((c) => c.name as string);
}

/** Everything `decide` needs about one person on one team, for news after `since`. */
export async function gatherFacts(
  tx: AppTransaction,
  ctx: OrgContext,
  me: Me,
  range: Range,
  today: string,
): Promise<Facts> {
  const comment = await newestComment(tx, ctx, me, range);
  return {
    isRider: me.rider !== null,
    checkedInToday: me.rider ? await checkedIn(tx, me.rider.id, today) : false,
    isParent: visibleChildren(me).length > 0,
    newestComment: comment?.at ?? null,
    newestPlanChange: me.rider ? await newestPlanChange(tx, ctx, me.rider.id, range, today) : null,
    isCoach: me.isCoach,
    newestRedCheckin: await newestRedCheckin(tx, ctx, me, today),
  };
}
