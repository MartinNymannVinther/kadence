import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { activities, comments, plannedSessions, users } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { requireWriteFor } from "@/modules/team/access";
import { id, isoDate } from "./vocabulary";

/**
 * The conversation about a rider's training (ADR 0012): on a session, an
 * activity or a day. Everybody who may read the rider's training reads the
 * thread; the coach and the rider write under their own names. There is no
 * other channel, and no private one.
 */

export const Target = z.union([
  z.object({ plannedSessionId: id }),
  z.object({ activityId: id }),
  z.object({ riderId: id, onDate: isoDate }),
]);
export type TargetT = z.infer<typeof Target>;

export const CommentBody = z.string().trim().min(1).max(4000);

export type CommentView = {
  id: string;
  body: string;
  authorId: string | null;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
};

function whereFor(target: TargetT) {
  if ("plannedSessionId" in target) return eq(comments.plannedSessionId, target.plannedSessionId);
  if ("activityId" in target) return eq(comments.activityId, target.activityId);
  return and(eq(comments.riderId, target.riderId), eq(comments.onDate, target.onDate));
}

export async function listComments(ctx: OrgContext, target: TargetT): Promise<CommentView[]> {
  return withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .select({
        id: comments.id,
        body: comments.body,
        authorId: comments.authorId,
        authorName: users.name,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.authorId))
      .where(whereFor(target))
      .orderBy(asc(comments.createdAt));
    return rows.map((r) => ({ ...r, authorName: r.authorName ?? "" }));
  });
}

export async function addComment(ctx: OrgContext, target: TargetT, body: string) {
  return withOrgContext(ctx, async (tx) => {
    let riderId: string;
    let onDate: string | null = null;
    if ("plannedSessionId" in target) {
      const [row] = await tx
        .select({ riderId: plannedSessions.riderId })
        .from(plannedSessions)
        .where(eq(plannedSessions.id, target.plannedSessionId));
      if (!row) throw new Refused("notFound");
      riderId = row.riderId;
    } else if ("activityId" in target) {
      const [row] = await tx
        .select({ riderId: activities.riderId })
        .from(activities)
        .where(eq(activities.id, target.activityId));
      if (!row) throw new Refused("notFound");
      riderId = row.riderId;
    } else {
      riderId = target.riderId;
      onDate = target.onDate;
    }
    await requireWriteFor(tx, ctx, riderId);
    const [row] = await tx
      .insert(comments)
      .values({
        orgId: ctx.orgId,
        riderId,
        authorId: ctx.userId,
        plannedSessionId: "plannedSessionId" in target ? target.plannedSessionId : null,
        activityId: "activityId" in target ? target.activityId : null,
        onDate,
        body,
      })
      .returning({ id: comments.id });
    return row!;
  });
}

export async function editComment(ctx: OrgContext, commentId: string, body: string) {
  await withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .update(comments)
      .set({ body })
      .where(and(eq(comments.id, commentId), eq(comments.authorId, ctx.userId)))
      .returning({ id: comments.id });
    if (rows.length === 0) throw new Refused("forbidden");
  });
}

/** The author, or a coach taking a comment down. */
export async function deleteComment(ctx: OrgContext, commentId: string) {
  await withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .delete(comments)
      .where(eq(comments.id, commentId))
      .returning({ id: comments.id });
    if (rows.length === 0) throw new Refused("forbidden");
  });
}
