/**
 * What a model call costs (docs/adr/0089). Pure: no database, no
 * environment; the service reads the installation's price list from
 * `ai_prices` (seeded from this file by drizzle/0049) and asks here.
 *
 * Money is counted in micro-euro (1 € = 1,000,000), as whole numbers, so
 * a month of calls adds up without a rounding error and fits a bigint.
 * Prices are per million tokens, the unit the provider publishes, which
 * keeps every price a whole number of micro-euro (per thousand, Mistral
 * Small's input would be 127.5).
 *
 * Source: Mistral's price list, https://docs.mistral.ai/models/pricing and
 * each model's card under https://docs.mistral.ai/models/, read on
 * 2026-10-11. Mistral publishes in USD; its own EUR view is USD × 0.85,
 * which is what is written here. Its regional endpoints — Kadence calls
 * api.eu.mistral.ai, dogma four — cost 10 % more ("Regional inference
 * (+10%)" on the same page); that factor is applied per call by
 * `regionalFactor`, because it belongs to the endpoint and not to the
 * model. Prices go stale: a price that is not here is unknown, the cost
 * of the call is null, and the Installation page says "pris ukendt"
 * rather than guess.
 */

export type AiPrice = {
  provider: string;
  /** An API model id as the provider names it, or "*" for every model of the provider. */
  model: string;
  /** Micro-euro per million input tokens; null when the price is not known. */
  inputMicroPerMtok: number | null;
  /** Micro-euro per million output tokens; null when the price is not known. */
  outputMicroPerMtok: number | null;
  /** The day the price applies from, a Copenhagen date. */
  validFrom: string;
  source: string;
};

export type AiUsage = { inputTokens: number; outputTokens: number };

const READ = "2026-10-11";
const MISTRAL_SOURCE = `https://docs.mistral.ai/models/pricing, read ${READ}; EUR as Mistral shows it (USD x 0.85)`;
/** Mistral's own conversion on its price page. */
const USD_TO_EUR = 0.85;

/** USD per million tokens, as Mistral lists it, into micro-euro per million. */
const fromUsd = (usd: number) => Math.round(usd * USD_TO_EUR * 1_000_000);

function mistral(
  models: string[],
  inUsd: number | null,
  outUsd: number | null,
  note = "",
): AiPrice[] {
  return models.map((model) => ({
    provider: "mistral",
    model,
    inputMicroPerMtok: inUsd === null ? null : fromUsd(inUsd),
    outputMicroPerMtok: outUsd === null ? null : fromUsd(outUsd),
    validFrom: READ,
    source: MISTRAL_SOURCE + note,
  }));
}

/**
 * The models Kadence chooses (`mistral-small-latest` by default,
 * src/core/llm/models.ts) and the generalist models a workspace may type
 * in instead, by every id the card names. Mistral Large 4 is listed at a
 * sale price beside its original one, with no date for either, so its
 * price is written as unknown rather than as a number that will quietly
 * be wrong.
 */
export const AI_PRICES: readonly AiPrice[] = [
  ...mistral(["mistral-small-latest", "mistral-small-2603"], 0.15, 0.6),
  ...mistral(["mistral-medium-latest", "mistral-medium-3", "mistral-medium-3-5"], 1.5, 7.5),
  ...mistral(["mistral-large-latest", "mistral-large-2512"], 0.5, 1.5),
  ...mistral(
    ["mistral-large-4", "mistral-large-4-0"],
    null,
    null,
    "; a sale price beside the original, no dates, so unknown",
  ),
  ...mistral(["ministral-14b-latest", "ministral-14b-2512"], 0.2, 0.2),
  ...mistral(["ministral-8b-latest", "ministral-8b-2512"], 0.15, 0.15),
  ...mistral(["ministral-3b-latest", "ministral-3b-2512"], 0.1, 0.1),
  {
    provider: "ollama",
    model: "*",
    inputMicroPerMtok: 0,
    outputMicroPerMtok: 0,
    validFrom: READ,
    source: "Ollama runs on the installation's own machine; a call costs no money",
  },
];

/** Mistral's regional endpoints, which cost 10 % more than the global one. */
const REGIONAL_HOSTS = new Set(["api.eu.mistral.ai", "api.us.mistral.ai"]);
export const REGIONAL_FACTOR = 1.1;

/** What the endpoint adds on top of the list price: 1.1 on a regional Mistral endpoint, else 1. */
export function regionalFactor(provider: string, baseUrl: string | null | undefined): number {
  if (provider !== "mistral" || !baseUrl) return 1;
  try {
    return REGIONAL_HOSTS.has(new URL(baseUrl).host) ? REGIONAL_FACTOR : 1;
  } catch {
    return 1;
  }
}

/**
 * The price in force for a model on a day: the exact model before the
 * provider's "*", and of those the one valid from latest, not after the
 * day. Null when nothing matches.
 */
export function priceFor(
  prices: readonly AiPrice[],
  provider: string,
  model: string,
  day: string,
): AiPrice | null {
  const candidates = prices.filter(
    (p) => p.provider === provider && (p.model === model || p.model === "*") && p.validFrom <= day,
  );
  candidates.sort(
    (a, b) =>
      Number(a.model === "*") - Number(b.model === "*") || b.validFrom.localeCompare(a.validFrom),
  );
  return candidates[0] ?? null;
}

/**
 * Micro-euro for one call, rounded to the nearest whole micro-euro. Null
 * when the provider did not say how many tokens it used, when there is no
 * price, or when the price is unknown: a cost nobody can stand behind is
 * not written down as a number.
 */
export function costMicro(usage: AiUsage | null, price: AiPrice | null, factor = 1): number | null {
  if (!usage || !price) return null;
  if (price.inputMicroPerMtok === null || price.outputMicroPerMtok === null) return null;
  const raw =
    usage.inputTokens * price.inputMicroPerMtok + usage.outputTokens * price.outputMicroPerMtok;
  return Math.round((raw * factor) / 1_000_000);
}

/** Micro-euro as euro for a person: two decimals, a comma in Danish. */
export function formatEuro(micro: number, locale: string): string {
  return new Intl.NumberFormat(locale === "da" ? "da-DK" : "en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(micro / 1_000_000);
}
