import { desc, eq, isNull, sql } from "drizzle-orm";
import { Refused } from "@/core/action";
import { communityPosts, communityReports, communityThreads } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { coachesSomewhere } from "./service";

/**
 * Keeping Trænerrummet decent (docs/adr/0052): any coach reports a thread
 * or a reply; the installation's owner sees the reports, hides or shows,
 * and locks a thread. The database refuses the same to anyone else.
 */

async function isOwner(tx: AppTransaction): Promise<boolean> {
  const result = await tx.execute(sql`select app_is_platform_owner() as ok`);
  return (result.rows[0] as { ok: boolean } | undefined)?.ok === true;
}

async function requireOwner(tx: AppTransaction) {
  if (!(await isOwner(tx))) throw new Refused("forbidden");
}

export async function canModerate(ctx: OrgContext): Promise<boolean> {
  return withOrgContext(ctx, isOwner);
}

export async function report(
  ctx: OrgContext,
  input: { targetKind: "thread" | "post"; targetId: string; reason: string },
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    if (!(await coachesSomewhere(tx))) throw new Refused("forbidden");
    await tx.insert(communityReports).values({ ...input, reporterUserId: ctx.userId });
  });
}

export type OpenReport = {
  id: string;
  targetKind: "thread" | "post";
  targetId: string;
  threadId: string | null;
  reason: string;
  createdAt: Date;
};

export async function openReports(ctx: OrgContext): Promise<OpenReport[]> {
  return withOrgContext(ctx, async (tx) => {
    if (!(await isOwner(tx))) return [];
    const rows = await tx
      .select()
      .from(communityReports)
      .where(isNull(communityReports.handledAt))
      .orderBy(desc(communityReports.createdAt));
    const out: OpenReport[] = [];
    for (const r of rows) {
      let threadId: string | null = r.targetKind === "thread" ? r.targetId : null;
      if (r.targetKind === "post") {
        const [p] = await tx
          .select({ threadId: communityPosts.threadId })
          .from(communityPosts)
          .where(eq(communityPosts.id, r.targetId));
        threadId = p?.threadId ?? null;
      }
      out.push({
        id: r.id,
        targetKind: r.targetKind as OpenReport["targetKind"],
        targetId: r.targetId,
        threadId,
        reason: r.reason,
        createdAt: r.createdAt,
      });
    }
    return out;
  });
}

export async function handleReport(ctx: OrgContext, id: string): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireOwner(tx);
    await tx
      .update(communityReports)
      .set({ handledAt: new Date(), handledBy: ctx.userId })
      .where(eq(communityReports.id, id));
  });
}

export async function setHidden(
  ctx: OrgContext,
  input: { targetKind: "thread" | "post"; targetId: string; hidden: boolean },
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireOwner(tx);
    const set = input.hidden
      ? { hiddenAt: new Date(), hiddenBy: ctx.userId }
      : { hiddenAt: null, hiddenBy: null };
    if (input.targetKind === "thread")
      await tx.update(communityThreads).set(set).where(eq(communityThreads.id, input.targetId));
    else await tx.update(communityPosts).set(set).where(eq(communityPosts.id, input.targetId));
  });
}

export async function setLocked(ctx: OrgContext, threadId: string, locked: boolean): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireOwner(tx);
    await tx.update(communityThreads).set({ locked }).where(eq(communityThreads.id, threadId));
  });
}
