import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { mondayOf } from "@/core/dates";
import { riders, users, weekPlanDrafts } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { requireCoach } from "@/modules/team/access";
import { MAX_PLAN_ITEMS, PlanItemInput } from "./week-plan";
import { TEAM_SCOPE } from "./week-draft-merge";

/**
 * The week planner's shared draft (ADR 0043, amended 2026-10-07; backlog
 * P2-05): the week as it is being made, kept on the server per team, week
 * and scope, so the team's coaches see and change the same week. The
 * planner saves it a moment after each change and reads it again now and
 * then; the last save wins, and who made it is kept beside it. Nothing
 * here reaches a calendar: laying the week in is `applyWeekPlan`, after
 * which the draft is cleared. A coach's; the database lets nobody else
 * read one (drizzle/0038).
 */

const id = z.string().min(1).max(100);

/** The planner's draft as it is kept: who the week is for, and its items as the server takes them. */
export const WeekPlanDraftPayload = z.object({
  riderIds: z.array(id).max(60),
  items: z.array(PlanItemInput).max(MAX_PLAN_ITEMS),
});
export type WeekPlanDraftPayloadT = z.infer<typeof WeekPlanDraftPayload>;

export const DraftKey = z.object({ monday: z.iso.date(), scope: id });
export type DraftKeyT = z.infer<typeof DraftKey>;

export const SaveDraftInput = DraftKey.extend({ payload: WeekPlanDraftPayload });
export type SaveDraftInputT = z.infer<typeof SaveDraftInput>;

export type SharedDraft = {
  payload: WeekPlanDraftPayloadT;
  /** When it was last saved, as an ISO time: what a device compares its own copy with. */
  updatedAt: string;
  /** Who saved it last: their name (empty when the account is gone), and whether it was the caller. */
  by: { name: string; me: boolean };
};

/** The rider a scope names, as a rider of this team, or null for the team's plan. */
async function riderOf(tx: AppTransaction, ctx: OrgContext, scope: string): Promise<string | null> {
  if (scope === TEAM_SCOPE) return null;
  const [row] = await tx
    .select({ id: riders.id })
    .from(riders)
    .where(and(eq(riders.id, scope), eq(riders.orgId, ctx.orgId)));
  if (!row) throw new Refused("notFound");
  return row.id;
}

function keyWhere(ctx: OrgContext, monday: string, riderId: string | null) {
  return and(
    eq(weekPlanDrafts.orgId, ctx.orgId),
    eq(weekPlanDrafts.weekMonday, monday),
    riderId === null ? isNull(weekPlanDrafts.riderId) : eq(weekPlanDrafts.riderId, riderId),
  );
}

async function readDraft(
  tx: AppTransaction,
  ctx: OrgContext,
  monday: string,
  riderId: string | null,
): Promise<SharedDraft | null> {
  const [row] = await tx
    .select({
      payload: weekPlanDrafts.payload,
      updatedAt: weekPlanDrafts.updatedAt,
      updatedBy: weekPlanDrafts.updatedBy,
      name: users.name,
    })
    .from(weekPlanDrafts)
    .leftJoin(users, eq(users.id, weekPlanDrafts.updatedBy))
    .where(keyWhere(ctx, monday, riderId));
  if (!row) return null;
  // Checked on the way out too: a draft that no longer reads is no draft, and the next save replaces it.
  const payload = WeekPlanDraftPayload.safeParse(row.payload);
  if (!payload.success) return null;
  return {
    payload: payload.data,
    updatedAt: row.updatedAt.toISOString(),
    by: { name: row.name ?? "", me: row.updatedBy === ctx.userId },
  };
}

/** The week's draft for the team, or for the one rider, as last saved; null when there is none. */
export async function getWeekPlanDraft(
  ctx: OrgContext,
  key: DraftKeyT,
): Promise<SharedDraft | null> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    return readDraft(tx, ctx, mondayOf(key.monday), await riderOf(tx, ctx, key.scope));
  });
}

/**
 * Keeps the draft as this coach has it now. The last save wins, whatever
 * was saved since this coach last read it; the other coaches' planners
 * find the newer draft when they next read it, and say so. Rider ids that
 * are not this team's riders are left out rather than kept.
 */
export async function saveWeekPlanDraft(
  ctx: OrgContext,
  input: SaveDraftInputT,
): Promise<SharedDraft> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const monday = mondayOf(input.monday);
    const riderId = await riderOf(tx, ctx, input.scope);
    const asked = [...new Set(input.payload.riderIds)];
    const known = asked.length
      ? new Set(
          (
            await tx
              .select({ id: riders.id })
              .from(riders)
              .where(and(eq(riders.orgId, ctx.orgId), inArray(riders.id, asked)))
          ).map((r) => r.id),
        )
      : new Set<string>();
    const payload = { ...input.payload, riderIds: asked.filter((r) => known.has(r)) };
    await tx
      .insert(weekPlanDrafts)
      .values({ orgId: ctx.orgId, weekMonday: monday, riderId, payload, updatedBy: ctx.userId })
      .onConflictDoUpdate({
        target: [weekPlanDrafts.orgId, weekPlanDrafts.weekMonday, weekPlanDrafts.riderId],
        set: { payload, updatedBy: ctx.userId, updatedAt: sql`now()` },
      });
    const saved = await readDraft(tx, ctx, monday, riderId);
    if (!saved) throw new Error("week plan draft: saved but not read back");
    return saved;
  });
}

/** Clears the draft once the week is laid in. A rider who is gone took their drafts along. */
export async function clearWeekPlanDraft(ctx: OrgContext, key: DraftKeyT): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const riderId = await riderOf(tx, ctx, key.scope).catch((error: unknown) => {
      if (error instanceof Refused) return undefined;
      throw error;
    });
    if (riderId === undefined) return;
    await tx.delete(weekPlanDrafts).where(keyWhere(ctx, mondayOf(key.monday), riderId));
  });
}
