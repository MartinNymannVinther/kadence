import { eq } from "drizzle-orm";
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
};

const FREE: WorkspacePlan = {
  plan: "free",
  kind: "club",
  trialEndsAt: null,
  paidUntil: null,
  freeReason: null,
  freeUntil: null,
};

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
