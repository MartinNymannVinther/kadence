import { eq, sql } from "drizzle-orm";
import { cache } from "react";
import { organizations } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { env } from "@/core/env";
import { isPlanState, type PlanState } from "./which-plan";

/**
 * Where a workspace stands with what it pays (docs/adr/0090), read under
 * RLS as a member of it. Imports nothing that imports the action runner,
 * so `runAction` (src/core/action.ts) can ask it without a cycle; the
 * refusals built on it are in plan.ts.
 *
 * With BILLING=off every workspace is free, whatever its row says, and
 * nothing is read: the installation behaves exactly as it did before
 * there were plans.
 *
 * With it on, the plan also carries today's AI budget and file quota of
 * the price plan the workspace is on (price_plans, drizzle/0053; ADR 0090
 * amended 12 October 2026). The AI's limits (src/modules/ai/limits.ts) and
 * the file quota (src/modules/storage/quota.ts) use them where the owner
 * gave the workspace no number of its own, before the installation's
 * defaults: the workspace's own number, then its plan's, then the
 * installation's.
 */

/** The word a write refused for an expired workspace carries, as the quota's carries "quota". */
export const PLAN_EXPIRED = "planExpired";

export type WorkspacePlan = {
  plan: PlanState;
  kind: "club" | "personal";
  trialEndsAt: Date | null;
  paidUntil: Date | null;
  freeReason: string | null;
  freeUntil: Date | null;
  /** The price plan's monthly AI budget in micro-euro; null with billing off or no such plan. */
  aiBudgetMicro: number | null;
  /** The price plan's file quota in bytes; null with billing off or no such plan. */
  fileQuotaBytes: number | null;
};

const FREE: WorkspacePlan = {
  plan: "free",
  kind: "club",
  trialEndsAt: null,
  paidUntil: null,
  freeReason: null,
  freeUntil: null,
  aiBudgetMicro: null,
  fileQuotaBytes: null,
};

/** Today's row of the workspace's price plan: its own, or the one its kind gives. */
const pricePlanNow = sql`price_plan_now(workspace_price_key(${organizations.kind}, ${organizations.pricePlan}))`;

const asNumber = (v: string | number | null) => (v === null ? null : Number(v));

export function billingOn(): boolean {
  return env.BILLING === "on";
}

/** The active workspace's plan inside a transaction that already has its context. */
export async function planIn(tx: AppTransaction, orgId: string): Promise<WorkspacePlan> {
  if (!billingOn()) return FREE;
  const [row] = await tx
    .select({
      plan: organizations.plan,
      kind: organizations.kind,
      trialEndsAt: organizations.trialEndsAt,
      paidUntil: organizations.paidUntil,
      freeReason: organizations.freeReason,
      freeUntil: organizations.freeUntil,
      aiBudgetMicro: sql<string | null>`(select pp.ai_budget_micro from ${pricePlanNow} pp)`,
      fileQuotaBytes: sql<string | null>`(select pp.file_quota_bytes from ${pricePlanNow} pp)`,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  if (!row) return FREE;
  return {
    plan: isPlanState(row.plan) ? row.plan : "free",
    kind: row.kind === "personal" ? "personal" : "club",
    trialEndsAt: row.trialEndsAt,
    paidUntil: row.paidUntil,
    freeReason: row.freeReason,
    freeUntil: row.freeUntil,
    aiBudgetMicro: asNumber(row.aiBudgetMicro),
    fileQuotaBytes: asNumber(row.fileQuotaBytes),
  };
}

const planFor = cache(async (orgId: string, userId: string): Promise<WorkspacePlan> =>
  withOrgContext({ orgId, userId }, (tx) => planIn(tx, orgId)),
);

/** The workspace's plan, once per request (cached by the ids, as workspaceKind is). */
export async function workspacePlan(ctx: OrgContext): Promise<WorkspacePlan> {
  if (!billingOn()) return FREE;
  return planFor(ctx.orgId, ctx.userId);
}

/** Whether the workspace may only be read and exported. */
export async function planExpired(ctx: OrgContext): Promise<boolean> {
  return (await workspacePlan(ctx)).plan === "expired";
}
