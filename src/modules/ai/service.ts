import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { LlmError, type LlmMessage, type LlmStreamEvent } from "@/core/llm";
import { errorName, log } from "@/core/log";
import { reserveAiCall, type AiKind } from "./limits";
import { workspaceLlm, workspaceLlmProvider } from "./model-settings";
import { parseModelJson } from "./parse-json";
import { recordAiUsage } from "./usage";
import type { AiFailure } from "./wire";

/** The word the interface shows for why the model did not answer. */
export type { AiFailure };

/**
 * One door to the model for every feature: the workspace's provider,
 * the call counted against the ceilings and the month's budget, the wait
 * bounded, the answer parsed or streamed, and what it cost written onto
 * the counted row afterwards (docs/adr/0089). There is no engine behind it — a chat with
 * no model is a chat that says so in the writing field, and everything
 * around it keeps working.
 */

export class NoModel extends Error {
  constructor() {
    super("no model");
    this.name = "NoModel";
  }
}

/**
 * The team has not let the AI read its riders' data (team_settings,
 * ADR 0017): a proposal that needs it says so instead of asking.
 */
export class NotAllowed extends Error {
  constructor() {
    super("not allowed");
    this.name = "NotAllowed";
  }
}

export type ModelAnswer = { data: unknown; engine: string };

/** True when a model is configured for this workspace, for the UI. */
export async function modelConfigured(ctx: OrgContext): Promise<boolean> {
  return (await workspaceLlmProvider(ctx)) !== null;
}

export async function askForJson(
  ctx: OrgContext,
  kind: AiKind,
  messages: LlmMessage[],
  options: { maxTokens?: number } = {},
): Promise<ModelAnswer> {
  const llm = await workspaceLlm(ctx);
  if (!llm) throw new NoModel();
  const { provider, billedTo } = llm;
  const engine = `${provider.id}:${provider.model}`;
  const callId = await withOrgContext(ctx, (tx) =>
    reserveAiCall(tx, ctx, kind, engine, {
      provider: provider.id,
      model: provider.model,
      billedTo,
    }),
  );
  // Local models load slowly the first time; a hosted one answers in seconds.
  const timeoutMs = provider.id === "ollama" ? 240_000 : 60_000;
  const completion = await provider.complete(messages, {
    responseFormat: "json",
    temperature: 0.3,
    maxTokens: options.maxTokens ?? 1200,
    timeoutMs,
  });
  await recordAiUsage(ctx, callId, provider, completion);
  const data = parseModelJson(completion.content);
  if (data === null) throw new LlmError("bad_response", "the model did not answer with JSON");
  return { data, engine };
}

/**
 * The conversation's door: the same provider, the same ceiling, the
 * same count, and the answer as it is written (docs/adr/0011). The call
 * is counted before the first token, so a refusal costs nothing; the
 * closing event's usage is written onto the counted row as it passes,
 * and the caller still gets every event, that one included.
 */
export async function streamAnswer(
  ctx: OrgContext,
  kind: AiKind,
  messages: LlmMessage[],
  options: { maxTokens?: number; temperature?: number } = {},
): Promise<{ engine: string; events: AsyncGenerator<LlmStreamEvent, void, undefined> }> {
  const llm = await workspaceLlm(ctx);
  if (!llm) throw new NoModel();
  const { provider, billedTo } = llm;
  const engine = `${provider.id}:${provider.model}`;
  const callId = await withOrgContext(ctx, (tx) =>
    reserveAiCall(tx, ctx, kind, engine, {
      provider: provider.id,
      model: provider.model,
      billedTo,
    }),
  );
  // A whole answer, not a JSON object: room for a page, and the patience a
  // local model needs to load and then write it.
  const timeoutMs = provider.id === "ollama" ? 600_000 : 300_000;
  const events = provider.stream(messages, {
    temperature: options.temperature ?? 0.4,
    maxTokens: options.maxTokens ?? 4096,
    timeoutMs,
  });
  async function* recorded(): AsyncGenerator<LlmStreamEvent, void, undefined> {
    for await (const event of events) {
      if (event.type === "done") await recordAiUsage(ctx, callId, provider, event);
      yield event;
    }
  }
  return { engine, events: recorded() };
}

export function classifyAiError(error: unknown): AiFailure {
  if (error instanceof NoModel) return "noModel";
  if (error instanceof NotAllowed) return "notAllowed";
  if (error instanceof Error && error.name === "RateLimited") return "rateLimited";
  if (error instanceof Error && error.name === "BudgetReached") return "budget";
  if (error instanceof Error && error.name === "PlanExpired") return "planExpired";
  if (error instanceof LlmError) {
    if (error.reason === "unreachable" || error.reason === "auth") return "unreachable";
    if (error.reason === "rate_limit") return "rateLimited";
    return "badAnswer";
  }
  void log.error("ai: call failed", { error: errorName(error) });
  return "generic";
}
