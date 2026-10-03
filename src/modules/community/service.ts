import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Refused } from "@/core/action";
import {
  communityPosts,
  communityReads,
  communityThreads,
  workoutTemplates,
} from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { requireCoach } from "@/modules/team/access";

/**
 * Trænerrummet (docs/adr/0052): threads and replies among the coaches of
 * one installation. Reading takes coaching a team somewhere; writing takes
 * coaching the active team, which is the club a post is signed with. The
 * database stamps the author and the club (community_stamp, drizzle/0023)
 * and keeps moderation to the installation's owner.
 */

import type { Category } from "./categories";

export { CATEGORIES, type Category } from "./categories";

export type ThreadWorkout = {
  name: string;
  sport: string;
  plannedMinutes: number;
  structure: unknown;
};

export type ThreadSummary = {
  id: string;
  category: Category;
  title: string;
  authorName: string;
  clubName: string;
  replies: number;
  lastPostAt: Date;
  unread: boolean;
  locked: boolean;
  hidden: boolean;
};

export async function coachesSomewhere(tx: AppTransaction): Promise<boolean> {
  const result = await tx.execute(sql`select app_is_coach_somewhere() as ok`);
  return (result.rows[0] as { ok: boolean } | undefined)?.ok === true;
}

async function requireRoom(tx: AppTransaction) {
  if (!(await coachesSomewhere(tx))) throw new Refused("forbidden");
}

export async function listThreads(
  ctx: OrgContext,
  category?: Category,
): Promise<ThreadSummary[] | null> {
  return withOrgContext(ctx, async (tx) => {
    if (!(await coachesSomewhere(tx))) return null;
    const rows = await tx
      .select({
        thread: communityThreads,
        replies: sql<number>`(select count(*)::int from community_posts p where p.thread_id = ${communityThreads.id} and p.hidden_at is null)`,
        readAt: communityReads.lastReadAt,
      })
      .from(communityThreads)
      .leftJoin(
        communityReads,
        and(
          eq(communityReads.threadId, communityThreads.id),
          eq(communityReads.userId, ctx.userId),
        ),
      )
      .where(category ? eq(communityThreads.category, category) : undefined)
      .orderBy(desc(communityThreads.lastPostAt))
      .limit(100);
    return rows.map(({ thread: t, replies, readAt }) => ({
      id: t.id,
      category: t.category as Category,
      title: t.title,
      authorName: t.authorName,
      clubName: t.clubName,
      replies,
      lastPostAt: t.lastPostAt,
      unread: t.authorUserId !== ctx.userId && (!readAt || readAt < t.lastPostAt),
      locked: t.locked,
      hidden: t.hiddenAt !== null,
    }));
  });
}

/** Threads with something new for this coach, for the count in the menu. */
export async function unreadThreadCount(ctx: OrgContext): Promise<number> {
  return withOrgContext(ctx, async (tx) => {
    if (!(await coachesSomewhere(tx))) return 0;
    const result = await tx.execute(sql`
      select count(*)::int as n from community_threads t
      left join community_reads r on r.thread_id = t.id and r.user_id = ${ctx.userId}
      where t.hidden_at is null
        and (t.author_user_id is distinct from ${ctx.userId})
        and (r.last_read_at is null or r.last_read_at < t.last_post_at)`);
    return (result.rows[0] as { n: number } | undefined)?.n ?? 0;
  });
}

export type ThreadView = {
  id: string;
  category: Category;
  title: string;
  body: string;
  workout: ThreadWorkout | null;
  authorName: string;
  clubName: string;
  mine: boolean;
  createdAt: Date;
  locked: boolean;
  hidden: boolean;
  posts: Array<{
    id: string;
    body: string;
    authorName: string;
    clubName: string;
    mine: boolean;
    createdAt: Date;
    hidden: boolean;
  }>;
};

/** A thread with its replies; opening it marks it read. */
export async function getThread(ctx: OrgContext, id: string): Promise<ThreadView | null> {
  return withOrgContext(ctx, async (tx) => {
    if (!(await coachesSomewhere(tx))) return null;
    const [t] = await tx.select().from(communityThreads).where(eq(communityThreads.id, id));
    if (!t) return null;
    const posts = await tx
      .select()
      .from(communityPosts)
      .where(eq(communityPosts.threadId, id))
      .orderBy(communityPosts.createdAt);
    await tx
      .insert(communityReads)
      .values({ userId: ctx.userId, threadId: id, lastReadAt: new Date() })
      .onConflictDoUpdate({
        target: [communityReads.userId, communityReads.threadId],
        set: { lastReadAt: new Date() },
      });
    return {
      id: t.id,
      category: t.category as Category,
      title: t.title,
      body: t.body,
      workout: (t.workout as ThreadWorkout | null) ?? null,
      authorName: t.authorName,
      clubName: t.clubName,
      mine: t.authorUserId === ctx.userId,
      createdAt: t.createdAt,
      locked: t.locked,
      hidden: t.hiddenAt !== null,
      posts: posts.map((p) => ({
        id: p.id,
        body: p.body,
        authorName: p.authorName,
        clubName: p.clubName,
        mine: p.authorUserId === ctx.userId,
        createdAt: p.createdAt,
        hidden: p.hiddenAt !== null,
      })),
    };
  });
}

/** A new thread, signed with the active club; a session from its library may come along. */
export async function createThread(
  ctx: OrgContext,
  input: { category: Category; title: string; body: string; templateId?: string | null },
): Promise<{ id: string }> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    let workout: ThreadWorkout | null = null;
    if (input.templateId) {
      const [tpl] = await tx
        .select()
        .from(workoutTemplates)
        .where(and(eq(workoutTemplates.id, input.templateId), isNull(workoutTemplates.riderId)));
      if (!tpl) throw new Refused("notFound");
      workout = {
        name: tpl.name,
        sport: tpl.sport,
        plannedMinutes: tpl.plannedMinutes,
        structure: tpl.structure,
      };
    }
    const [row] = await tx
      .insert(communityThreads)
      .values({ category: input.category, title: input.title, body: input.body, workout })
      .returning({ id: communityThreads.id });
    return row!;
  });
}

export async function reply(
  ctx: OrgContext,
  threadId: string,
  body: string,
): Promise<{ id: string }> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const [row] = await tx
      .insert(communityPosts)
      .values({ threadId, body })
      .returning({ id: communityPosts.id });
    await tx
      .update(communityThreads)
      .set({ lastPostAt: new Date() })
      .where(eq(communityThreads.id, threadId));
    return row!;
  });
}

/** A thread's session into the active club's library, as the coach's own. */
export async function takeWorkout(ctx: OrgContext, threadId: string): Promise<{ id: string }> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    await requireRoom(tx);
    const [t] = await tx.select().from(communityThreads).where(eq(communityThreads.id, threadId));
    const workout = t?.workout as ThreadWorkout | null | undefined;
    if (!t || !workout) throw new Refused("notFound");
    const [row] = await tx
      .insert(workoutTemplates)
      .values({
        orgId: ctx.orgId,
        name: workout.name.slice(0, 120),
        sport: workout.sport,
        description: "",
        structure: workout.structure,
        plannedMinutes: workout.plannedMinutes,
        source: "own",
        createdBy: ctx.userId,
      })
      .returning({ id: workoutTemplates.id });
    return row!;
  });
}
