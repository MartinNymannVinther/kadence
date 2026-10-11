import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MISTRAL_EU_BASE_URL, MistralProvider } from "@/core/llm/mistral";
import { OllamaProvider } from "@/core/llm/ollama";
import type { LlmStreamEvent } from "@/core/llm/types";
import { AI_PRICES, costMicro, priceFor, regionalFactor } from "@/modules/ai/prices";

/**
 * The token counts a call is priced from (docs/adr/0089), read from whole
 * responses in the shape each provider documents — Mistral's chat
 * completion and its server-sent events, where only the last event
 * carries `usage`, and Ollama's /api/chat with `prompt_eval_count` and
 * `eval_count` beside its timings — rather than from the two fields
 * alone. The fixtures sit in tests/llm/fixtures.
 */

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

function answering(body: string, contentType: string): typeof fetch {
  return async () => new Response(body, { status: 200, headers: { "Content-Type": contentType } });
}

describe("Mistral's usage", () => {
  it("comes from a completion, with the model that answered", async () => {
    const provider = new MistralProvider(
      "key",
      "mistral-small-latest",
      answering(fixture("mistral-chat.json"), "application/json"),
    );
    const answer = await provider.complete([{ role: "user", content: "hej" }]);
    expect(answer.usage).toEqual({ inputTokens: 1843, outputTokens: 31 });
    expect(answer.model).toBe("mistral-small-latest");

    const price = priceFor(AI_PRICES, "mistral", answer.model, "2026-10-11");
    // (1843 × 127,500 + 31 × 510,000) / 1,000,000 × 1.1 = 275.88, so 276.
    expect(costMicro(answer.usage, price, regionalFactor("mistral", MISTRAL_EU_BASE_URL))).toBe(
      276,
    );
  });

  it("comes from the last event of a stream", async () => {
    const provider = new MistralProvider(
      "key",
      "mistral-small-latest",
      answering(fixture("mistral-stream.txt"), "text/event-stream"),
    );
    const events: LlmStreamEvent[] = [];
    for await (const event of provider.stream([{ role: "user", content: "hej" }])) {
      events.push(event);
    }
    expect(events.at(-1)).toEqual({
      type: "done",
      model: "mistral-small-latest",
      usage: { inputTokens: 2210, outputTokens: 14 },
      finish: "stop",
    });
  });

  it("is null when the response has none, and so is the cost", async () => {
    const body = JSON.parse(fixture("mistral-chat.json")) as Record<string, unknown>;
    delete body.usage;
    const provider = new MistralProvider(
      "key",
      "mistral-small-latest",
      answering(JSON.stringify(body), "application/json"),
    );
    const answer = await provider.complete([{ role: "user", content: "hej" }]);
    expect(answer.usage).toBeNull();
    expect(
      costMicro(answer.usage, priceFor(AI_PRICES, "mistral", answer.model, "2026-10-11")),
    ).toBe(null);
  });
});

describe("Ollama's usage", () => {
  it("comes from the prompt and eval counts, and costs nothing", async () => {
    const provider = new OllamaProvider(
      "http://localhost:11434",
      "llama3.2",
      answering(fixture("ollama-chat.json"), "application/json"),
    );
    const answer = await provider.complete([{ role: "user", content: "hej" }], {
      responseFormat: "json",
    });
    expect(answer.usage).toEqual({ inputTokens: 1520, outputTokens: 12 });
    expect(costMicro(answer.usage, priceFor(AI_PRICES, "ollama", answer.model, "2026-10-11"))).toBe(
      0,
    );
  });
});
