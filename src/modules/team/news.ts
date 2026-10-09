import { and, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import { activities, checkins, comments, plannedSessions, riders } from "@/core/db/schema";
import { addDaysIso } from "@/core/dates";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";

/**
 * "Nyt fra rytterne" on a coach's Overblik: what the riders themselves
 * have written lately, newest first — a comment on a session, a ride or
 * a day (ADR 0012), and the note on a check-in. Without it a coach opens
 * every session to find what a rider said.
 *
 * A comment counts when its author is the rider it is about: a coach's
 * words are not the riders', and neither are those of a coach who also
 * rides, written on another rider's session. A check-in is the rider's by
 * what it is; only its note leaves the database, never the answers
 * beside it.
 *
 * Plain selects under the caller's RLS, so the list is never more than
 * the caller may read anyway: a coach gets the team, a rider their own,
 * a parent the child's training and the notes only if the child shares
 * check-ins (ADR 0011).
 */

export const NEWS_DAYS = 14;
export const NEWS_LIMIT = 6;

export type RiderNews = {
  kind: "comment" | "checkin";
  /** What it is about: a planned session, a ride, or the rider's day (a check-in is a day's). */
  on: "session" | "activity" | "day";
  /** The id of the comment or the check-in. */
  id: string;
  riderId: string;
  riderName: string;
  /** When it was written: a comment when it was posted, a check-in when it was last saved. */
  at: Date;
  text: string;
  /** The session's or the ride's title ("" for a ride without one), or the day (yyyy-mm-dd). */
  about: string;
  /** Where the coach reads more and answers. */
  href: string;
};

/** A day's comment and a check-in are read on the rider's page, with the 14 days around them. */
const riderHref = (riderId: string) => `/riders/${encodeURIComponent(riderId)}`;

/** A Copenhagen day's first moment, so the window follows Danish days whatever the server's zone. */
const dayStart = (iso: string) => sql`((${iso})::date)::timestamp at time zone 'Europe/Copenhagen'`;

export async function listRiderNews(
  ctx: OrgContext,
  options: { today: string; days?: number; limit?: number },
): Promise<RiderNews[]> {
  const { today, days = NEWS_DAYS, limit = NEWS_LIMIT } = options;
  const from = addDaysIso(today, -(days - 1));
  const until = addDaysIso(today, 1);
  return withOrgContext(ctx, async (tx) => {
    const said = await tx
      .select({
        id: comments.id,
        riderId: comments.riderId,
        riderName: riders.name,
        at: comments.createdAt,
        body: comments.body,
        sessionId: comments.plannedSessionId,
        sessionTitle: plannedSessions.title,
        activityId: comments.activityId,
        activityTitle: activities.title,
        onDate: comments.onDate,
      })
      .from(comments)
      // The rider the comment is about wrote it: the riders' own words, nobody else's.
      .innerJoin(riders, and(eq(riders.id, comments.riderId), eq(riders.userId, comments.authorId)))
      .leftJoin(plannedSessions, eq(plannedSessions.id, comments.plannedSessionId))
      .leftJoin(activities, eq(activities.id, comments.activityId))
      .where(
        and(
          eq(riders.archived, false),
          gte(comments.createdAt, dayStart(from)),
          lt(comments.createdAt, dayStart(until)),
        ),
      )
      .orderBy(desc(comments.createdAt))
      .limit(limit);

    const notes = await tx
      .select({
        id: checkins.id,
        riderId: checkins.riderId,
        riderName: riders.name,
        at: checkins.updatedAt,
        note: checkins.note,
        onDate: checkins.onDate,
      })
      .from(checkins)
      .innerJoin(riders, eq(riders.id, checkins.riderId))
      .where(
        and(
          eq(riders.archived, false),
          gte(checkins.onDate, from),
          lte(checkins.onDate, today),
          sql`btrim(${checkins.note}) <> ''`,
        ),
      )
      .orderBy(desc(checkins.updatedAt))
      .limit(limit);

    const items: RiderNews[] = [
      ...said.map((c): RiderNews => {
        const base = {
          kind: "comment" as const,
          id: c.id,
          riderId: c.riderId,
          riderName: c.riderName,
          at: c.at,
          text: c.body,
        };
        if (c.sessionId)
          return {
            ...base,
            on: "session",
            about: c.sessionTitle ?? "",
            href: `/today?session=${encodeURIComponent(c.sessionId)}`,
          };
        if (c.activityId)
          return {
            ...base,
            on: "activity",
            about: c.activityTitle ?? "",
            href: `/activities/${encodeURIComponent(c.activityId)}`,
          };
        return { ...base, on: "day", about: c.onDate ?? "", href: riderHref(c.riderId) };
      }),
      ...notes.map((n): RiderNews => ({
        kind: "checkin",
        on: "day",
        id: n.id,
        riderId: n.riderId,
        riderName: n.riderName,
        at: n.at,
        text: n.note.trim(),
        about: n.onDate,
        href: riderHref(n.riderId),
      })),
    ];
    return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
  });
}
