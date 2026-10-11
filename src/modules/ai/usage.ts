import { eq } from "drizzle-orm";
import { todayInCopenhagen } from "@/core/dates";
import { aiCalls, aiPrices } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { env } from "@/core/env";
import type { LlmUsage } from "@/core/llm";
import { errorName, log } from "@/core/log";
import { monthlyBudgetMicro, spentThisMonthMicro } from "./limits";
import { costMicro, priceFor, regionalFactor, type AiPrice } from "./prices";

/**
 * The second half of reserve-then-record (docs/adr/0089): once the model
 * has answered, the counted row gets the provider's own token counts, the
 * model that answered and what it cost, priced from the installation's
 * list (`ai_prices`) on today's Copenhagen date. It is one small write
 * after the answer, and the answer never fails because of it: a cost
 * that could not be written is logged and the row keeps its nulls.
 */
export type AiAnswerUsage = { model: string; usage: LlmUsage };

export async function recordAiUsage(
  ctx: OrgContext,
  callId: string,
  provider: { id: string; model: string },
  answer: AiAnswerUsage,
): Promise<void> {
  try {
    await withOrgContext(ctx, async (tx) => {
      const rows = await tx.select().from(aiPrices).where(eq(aiPrices.provider, provider.id));
      const prices: AiPrice[] = rows.map((r) => ({
        provider: r.provider,
        model: r.model,
        inputMicroPerMtok: r.inputMicroPerMtok,
        outputMicroPerMtok: r.outputMicroPerMtok,
        validFrom: r.validFrom,
        source: r.source,
      }));
      const day = todayInCopenhagen();
      // The model that answered names the version; the one asked for may
      // be the alias the list carries. Either is the same price.
      const price =
        priceFor(prices, provider.id, answer.model, day) ??
        priceFor(prices, provider.id, provider.model, day);
      const factor = regionalFactor(provider.id, env.MISTRAL_BASE_URL);
      await tx
        .update(aiCalls)
        .set({
          model: answer.model,
          tokensIn: answer.usage?.inputTokens ?? null,
          tokensOut: answer.usage?.outputTokens ?? null,
          costMicro: costMicro(answer.usage, price, factor),
        })
        .where(eq(aiCalls.id, callId));
    });
  } catch (error) {
    await log.error("ai: could not record usage", { orgId: ctx.orgId, error: errorName(error) });
  }
}

/** This calendar month for the workspace: spent on the installation's key, and the budget (0 = none). */
export async function aiMonth(
  ctx: OrgContext,
): Promise<{ spentMicro: number; budgetMicro: number }> {
  return withOrgContext(ctx, async (tx) => ({
    spentMicro: await spentThisMonthMicro(tx, ctx),
    budgetMicro: await monthlyBudgetMicro(tx, ctx),
  }));
}
