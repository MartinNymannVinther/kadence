import { monthlyPrice, yearlyPrice, type PricePlan } from "./which-plan";

/**
 * What the open price page shows and what the owner's price table works
 * out (docs/plan-konto-og-priser.md §2.7, docs/adr/0090). Pure: the
 * numbers are price_plans' rows (price-list.ts), never written here.
 */

/** The plans the price page has a card for, in order: a rider alone, a club. */
export const CARD_PLANS = ["person", "club"] as const;
export type CardPlan = (typeof CARD_PLANS)[number];

/** The young rider's plan, free alone through U19 (which-plan.ts). */
export const YOUTH_PLAN = "youth";

/** The club sizes the owner's table shows a price for: below, at and past what is included. */
export const EXAMPLE_RIDERS = [12, 20, 21, 40] as const;

type Listed = PricePlan & {
  nameDa: string;
  nameEn: string;
  fileQuotaBytes: number;
  vatIncluded: boolean;
};

export type PriceCard = {
  key: CardPlan;
  name: string;
  yearlyDkk: number;
  monthlyDkk: number;
  /** "op til 20 ryttere, derefter 50 kr. pr. rytter om året"; null when the price does not grow. */
  perRider: { included: number; perRiderDkk: number } | null;
  /** The file quota in whole decimal gigabytes, as price_plans holds it. */
  fileGb: number;
  vatIncluded: boolean;
};

export type PricePage = {
  cards: PriceCard[];
  /** A young rider alone rides free: the youth plan is there and costs nothing. */
  youthFree: boolean;
};

/** Decimal gigabytes, at most one decimal: 2.000.000.000 bytes is 2 GB. */
export function gigabytes(bytes: number): number {
  return Math.round(bytes / 1e8) / 10;
}

export function pricePage(plans: Array<Listed & { key: string }>, locale: string): PricePage {
  const byKey = new Map(plans.map((p) => [p.key, p]));
  const cards: PriceCard[] = [];
  for (const key of CARD_PLANS) {
    const plan = byKey.get(key);
    if (!plan) continue;
    cards.push({
      key,
      name: locale === "en" ? plan.nameEn : plan.nameDa,
      yearlyDkk: plan.priceYearDkk,
      monthlyDkk: monthlyPrice(plan.priceYearDkk),
      perRider:
        plan.perRiderDkk !== null && plan.includedRiders !== null
          ? { included: plan.includedRiders, perRiderDkk: plan.perRiderDkk }
          : null,
      fileGb: gigabytes(plan.fileQuotaBytes),
      vatIncluded: plan.vatIncluded,
    });
  }
  const youth = byKey.get(YOUTH_PLAN);
  return { cards, youthFree: youth !== undefined && youth.priceYearDkk === 0 };
}

/** What a plan comes to for each of the example club sizes, a year and a month. */
export function priceExamples(
  plan: PricePlan,
  riders: readonly number[] = EXAMPLE_RIDERS,
): Array<{ riders: number; yearlyDkk: number; monthlyDkk: number }> {
  return riders.map((n) => {
    const yearly = yearlyPrice(plan, n);
    return { riders: n, yearlyDkk: yearly, monthlyDkk: monthlyPrice(yearly) };
  });
}
