import { and, count, eq, gt, gte, sql, sum } from "drizzle-orm";
import { aiCalls, teamSettings } from "@/core/db/schema";
import type { AppTransaction, OrgContext } from "@/core/db/tenant";
import { env } from "@/core/env";
import { planIn } from "@/modules/billing/state";
import type { BilledTo } from "./model-settings";

/**
 * Ceilings on the AI surface. A model call costs money on a hosted
 * installation and minutes on a local one, and a prompt built from a
 * card is a prompt that will one day be built from a card holding a
 * novel. The numbers are generous for a person and mean for a script.
 *
 * Counted inside the tenant context, so each sees one workspace and
 * answers for it: 60 calls per person an hour, 600 per workspace a day,
 * and a budget per workspace for the calendar month in micro-euro
 * (docs/adr/0089) — the installation's AI_MONTHLY_BUDGET_MICRO unless its
 * owner gave the workspace another. The budget counts only what the
 * installation's own key spent; a workspace on its own key (ADR 0006)
 * pays its own bill. The fourth, the installation's daily roof (ADR
 * 0009), is now an emergency brake that is off unless it is set: shared,
 * it let one busy club close the AI for everybody.
 */
export const MAX_INPUT_CHARS = 6000;
export const MAX_CALLS_PER_USER_PER_HOUR = 60;
export const MAX_CALLS_PER_WORKSPACE_PER_DAY = 600;
/** Set by the installation (AI_DAILY_CALL_CAP); 0, the default, means no roof at all. */
export const MAX_CALLS_PER_INSTALLATION_PER_DAY = env.AI_DAILY_CALL_CAP;
/** Set by the installation (AI_MONTHLY_BUDGET_MICRO); 0 means no budget at all. */
export const DEFAULT_MONTHLY_BUDGET_MICRO = env.AI_MONTHLY_BUDGET_MICRO;

/**
 * What a model call was for (docs/adr/0017): `week_draft` a proposed week
 * of sessions for a rider, `build_workout` a coach's words built into a
 * bike or strength session (docs/adr/0038; `parse_workout` before it, on
 * rows already counted), `group_week` a week for a group of riders
 * from DCU and the team's library (docs/adr/0043), `coach_brief` the
 * Monday summary of who needs attention, `test` the connection test
 * under Settings → AI.
 */
export type AiKind =
  | "week_draft"
  | "build_workout"
  | "build_program"
  | "parse_workout"
  | "group_week"
  | "coach_brief"
  | "test";

export class RateLimited extends Error {
  constructor() {
    super("rate limited");
    this.name = "RateLimited";
  }
}

/** The workspace has spent its month: "AI'en holder pause til næste måned". */
export class BudgetReached extends Error {
  constructor() {
    super("budget reached");
    this.name = "BudgetReached";
  }
}

/** The workspace's trial or payment has run out: it reads and exports, and asks no model (docs/adr/0090). */
export class PlanExpired extends Error {
  constructor() {
    super("plan expired");
    this.name = "PlanExpired";
  }
}

/** Who answers the call, and whose key pays for it. */
export type AiBilling = { provider: string; model: string; billedTo: BilledTo };

const MONTH_START = sql`(date_trunc('month', now() at time zone 'Europe/Copenhagen') at time zone 'Europe/Copenhagen')`;

/**
 * The workspace's budget for the month in micro-euro, or 0 for none: its
 * own when the owner set one, else the installation's.
 */
export async function monthlyBudgetMicro(tx: AppTransaction, ctx: OrgContext): Promise<number> {
  const [row] = await tx
    .select({ budget: teamSettings.aiBudgetMicro })
    .from(teamSettings)
    .where(eq(teamSettings.orgId, ctx.orgId))
    .limit(1);
  return row?.budget ?? DEFAULT_MONTHLY_BUDGET_MICRO;
}

/** What the installation's key spent for this workspace this calendar month, in micro-euro. */
export async function spentThisMonthMicro(tx: AppTransaction, ctx: OrgContext): Promise<number> {
  const [row] = await tx
    .select({ spent: sum(aiCalls.costMicro) })
    .from(aiCalls)
    .where(
      and(
        eq(aiCalls.orgId, ctx.orgId),
        eq(aiCalls.billedTo, "installation"),
        gte(aiCalls.createdAt, MONTH_START),
      ),
    );
  return Number(row?.spent ?? 0);
}

/**
 * Counts the call, or refuses it when the caller, the workspace or the
 * installation is over the line, and answers the counted row's id so the
 * tokens and the cost can be written onto it once the model has answered
 * (`recordAiUsage`). Called before the model is asked, never after, so a
 * refusal costs nothing but a row that is not written.
 *
 * The caller's own ceilings are checked first: they are index lookups,
 * they name the caller's own doing, and checking them first means the
 * count across every workspace is only paid for by a call that would
 * otherwise have been allowed.
 *
 * All of them are ceilings, not quotas. Two calls landing at the same
 * moment can both read the count below the line and both be let through,
 * which overshoots by the number of calls in flight and never by more;
 * and the budget is soft by nature, because a call's cost is known only
 * after it was made. Serialising the whole AI surface to close that would
 * cost every user a queue to save an installation a few cents.
 */
export async function reserveAiCall(
  tx: AppTransaction,
  ctx: OrgContext,
  kind: AiKind,
  engine: string,
  billing: AiBilling | null = null,
): Promise<string> {
  if ((await planIn(tx, ctx.orgId)).plan === "expired") throw new PlanExpired();
  const [perUser] = await tx
    .select({ n: count() })
    .from(aiCalls)
    .where(
      and(eq(aiCalls.userId, ctx.userId), gt(aiCalls.createdAt, sql`now() - interval '1 hour'`)),
    );
  if (Number(perUser?.n ?? 0) >= MAX_CALLS_PER_USER_PER_HOUR) throw new RateLimited();
  const [perOrg] = await tx
    .select({ n: count() })
    .from(aiCalls)
    .where(and(eq(aiCalls.orgId, ctx.orgId), gt(aiCalls.createdAt, sql`now() - interval '1 day'`)));
  if (Number(perOrg?.n ?? 0) >= MAX_CALLS_PER_WORKSPACE_PER_DAY) throw new RateLimited();
  const billedTo = billing?.billedTo ?? "installation";
  if (billedTo === "installation") {
    const budget = await monthlyBudgetMicro(tx, ctx);
    if (budget > 0 && (await spentThisMonthMicro(tx, ctx)) >= budget) throw new BudgetReached();
  }
  if (MAX_CALLS_PER_INSTALLATION_PER_DAY > 0) {
    // The one count that has to see past this workspace, and the only way
    // it is allowed to: a definer's-rights function that returns the
    // number and never a row (drizzle/0001, ADR 0009). A plain count
    // here would read one workspace's rows under RLS and always agree
    // that the installation was fine.
    const result = await tx.execute(sql`select ai_calls_last_day() as n`);
    // count(*) is a bigint, which pg hands back as a string. A number that
    // cannot be read is treated as over the roof: for a ceiling on spend,
    // "unknown" must not be allowed to mean "fine".
    const [row] = result.rows as Array<{ n?: string | number | null }>;
    const total = Number(row?.n);
    if (!Number.isFinite(total) || total >= MAX_CALLS_PER_INSTALLATION_PER_DAY)
      throw new RateLimited();
  }
  const [counted] = await tx
    .insert(aiCalls)
    .values({
      orgId: ctx.orgId,
      userId: ctx.userId,
      kind,
      engine,
      provider: billing?.provider ?? null,
      model: billing?.model ?? null,
      billedTo,
    })
    .returning({ id: aiCalls.id });
  return counted!.id;
}

/** Trims and caps user text before it goes anywhere near a prompt. */
export function capText(text: unknown, max: number): string {
  return typeof text === "string" ? text.replace(/\r\n/g, "\n").trim().slice(0, max) : "";
}
