import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL } from "@/core/llm/models";
import { MISTRAL_EU_BASE_URL } from "@/core/llm/mistral";
import {
  AI_PRICES,
  costMicro,
  formatEuro,
  priceFor,
  REGIONAL_FACTOR,
  regionalFactor,
  type AiPrice,
} from "@/modules/ai/prices";

/**
 * What a call costs (docs/adr/0089), pure. Mistral lists USD per million
 * tokens and shows EUR as USD × 0.85; the EU endpoint costs 10 % more
 * (https://docs.mistral.ai/models/pricing, read 2026-10-11).
 */

const DAY = "2026-10-11";

describe("the price list", () => {
  it("prices the model Kadence chooses by default, from Mistral's own numbers", () => {
    const small = priceFor(AI_PRICES, "mistral", DEFAULT_MODEL.mistral, DAY);
    // $0.15 and $0.60 per million, × 0.85.
    expect(small).toMatchObject({ inputMicroPerMtok: 127_500, outputMicroPerMtok: 510_000 });
    expect(small?.source).toContain("docs.mistral.ai/models/pricing");
  });

  it("knows Ollama costs nothing, whatever the model is called", () => {
    expect(priceFor(AI_PRICES, "ollama", "llama3.2:latest", DAY)).toMatchObject({
      inputMicroPerMtok: 0,
      outputMicroPerMtok: 0,
    });
  });

  it("says unknown rather than guess, and nothing at all for a model it never heard of", () => {
    expect(priceFor(AI_PRICES, "mistral", "mistral-large-4", DAY)?.inputMicroPerMtok).toBeNull();
    expect(priceFor(AI_PRICES, "mistral", "some-model-from-2030", DAY)).toBeNull();
  });

  it("has every price a whole number of micro-euro, one row per model and day", () => {
    for (const p of AI_PRICES) {
      for (const v of [p.inputMicroPerMtok, p.outputMicroPerMtok]) {
        if (v !== null) expect(Number.isInteger(v) && v >= 0).toBe(true);
      }
    }
    const keys = AI_PRICES.map((p) => `${p.provider}|${p.model}|${p.validFrom}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("takes the newest price not after the day, and the exact model before the provider's *", () => {
    const list: AiPrice[] = [
      {
        provider: "x",
        model: "*",
        inputMicroPerMtok: 1,
        outputMicroPerMtok: 1,
        validFrom: "2026-01-01",
        source: "",
      },
      {
        provider: "x",
        model: "m",
        inputMicroPerMtok: 2,
        outputMicroPerMtok: 2,
        validFrom: "2026-01-01",
        source: "",
      },
      {
        provider: "x",
        model: "m",
        inputMicroPerMtok: 3,
        outputMicroPerMtok: 3,
        validFrom: "2026-11-01",
        source: "",
      },
    ];
    expect(priceFor(list, "x", "m", "2026-10-11")?.inputMicroPerMtok).toBe(2);
    expect(priceFor(list, "x", "m", "2026-11-01")?.inputMicroPerMtok).toBe(3);
    expect(priceFor(list, "x", "other", "2026-10-11")?.inputMicroPerMtok).toBe(1);
    expect(priceFor(list, "x", "m", "2025-12-31")).toBeNull();
  });
});

describe("the cost of one call", () => {
  const small = priceFor(AI_PRICES, "mistral", "mistral-small-latest", DAY);

  it("adds input and output at their own prices, with the EU endpoint's 10 %", () => {
    // 1000 × 127,500 + 500 × 510,000 = 382,500,000 micro-euro per million
    // tokens; ÷ 1,000,000 = 382.5; × 1.1 = 420.75, rounded to 421.
    expect(costMicro({ inputTokens: 1000, outputTokens: 500 }, small, REGIONAL_FACTOR)).toBe(421);
    expect(costMicro({ inputTokens: 1000, outputTokens: 500 }, small)).toBe(383);
  });

  it("is null when the provider gave no count, there is no price, or the price is unknown", () => {
    expect(costMicro(null, small)).toBeNull();
    expect(costMicro({ inputTokens: 10, outputTokens: 10 }, null)).toBeNull();
    const unknown = priceFor(AI_PRICES, "mistral", "mistral-large-4", DAY);
    expect(costMicro({ inputTokens: 10, outputTokens: 10 }, unknown)).toBeNull();
  });

  it("is zero, not null, on Ollama", () => {
    const ollama = priceFor(AI_PRICES, "ollama", "llama3.2", DAY);
    expect(costMicro({ inputTokens: 5000, outputTokens: 5000 }, ollama)).toBe(0);
  });

  it("five euro is a few thousand proposals on Mistral Small", () => {
    // A proposal: about 3,000 tokens in and 1,000 out.
    const one = costMicro({ inputTokens: 3000, outputTokens: 1000 }, small, REGIONAL_FACTOR)!;
    expect(Math.floor(5_000_000 / one)).toBeGreaterThan(2000);
  });
});

describe("the endpoint's share", () => {
  it("is 1.1 on Mistral's regional endpoints and 1 elsewhere", () => {
    expect(regionalFactor("mistral", MISTRAL_EU_BASE_URL)).toBe(1.1);
    expect(regionalFactor("mistral", "https://api.us.mistral.ai/v1")).toBe(1.1);
    expect(regionalFactor("mistral", "https://api.mistral.ai/v1")).toBe(1);
    expect(regionalFactor("ollama", MISTRAL_EU_BASE_URL)).toBe(1);
    expect(regionalFactor("mistral", "not a url")).toBe(1);
  });
});

describe("euro for a person", () => {
  it("writes two decimals, with a comma in Danish", () => {
    expect(formatEuro(5_000_000, "da")).toMatch(/^5,00\s€$/);
    expect(formatEuro(421, "da")).toMatch(/^0,00\s€$/);
    expect(formatEuro(1_234_567, "en")).toBe("€1.23");
  });
});
