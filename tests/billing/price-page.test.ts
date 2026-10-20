import { describe, expect, it } from "vitest";
import { gigabytes, priceExamples, pricePage } from "@/modules/billing/price-page";

/**
 * The open price page and the owner's price table (docs/plan-konto-og-
 * priser.md §2.7, §3.3, docs/adr/0090): the cards come from price_plans'
 * rows, a month is the year over twelve, and a club's price for 12, 20,
 * 21 and 40 riders is the plan's sum.
 */

const ROW = { vatIncluded: true, aiBudgetMicro: 5_000_000 };
const PLANS = [
  {
    ...ROW,
    key: "club",
    nameDa: "Klub",
    nameEn: "Club",
    priceYearDkk: 1200,
    perRiderDkk: 50,
    includedRiders: 20,
    fileQuotaBytes: 20_000_000_000,
  },
  {
    ...ROW,
    key: "person",
    nameDa: "Rytter alene",
    nameEn: "Rider alone",
    priceYearDkk: 290,
    perRiderDkk: null,
    includedRiders: null,
    fileQuotaBytes: 2_000_000_000,
  },
  {
    ...ROW,
    key: "youth",
    nameDa: "Ung rytter alene",
    nameEn: "Young rider alone",
    priceYearDkk: 0,
    perRiderDkk: null,
    includedRiders: null,
    fileQuotaBytes: 2_000_000_000,
  },
];

describe("the price page", () => {
  it("has a card for a rider alone and one for a club, in that order, from the rows", () => {
    const page = pricePage(PLANS, "da");
    expect(page.cards).toEqual([
      {
        key: "person",
        name: "Rytter alene",
        yearlyDkk: 290,
        monthlyDkk: 24,
        perRider: null,
        fileGb: 2,
        vatIncluded: true,
      },
      {
        key: "club",
        name: "Klub",
        yearlyDkk: 1200,
        monthlyDkk: 100,
        perRider: { included: 20, perRiderDkk: 50 },
        fileGb: 20,
        vatIncluded: true,
      },
    ]);
    expect(page.youthFree).toBe(true);
    expect(pricePage(PLANS, "en").cards.map((c) => c.name)).toEqual(["Rider alone", "Club"]);
  });

  it("says a young rider is free only when the youth plan is there and costs nothing", () => {
    expect(pricePage(PLANS.slice(0, 2), "da").youthFree).toBe(false);
    const paid = PLANS.map((p) => (p.key === "youth" ? { ...p, priceYearDkk: 100 } : p));
    expect(pricePage(paid, "da").youthFree).toBe(false);
  });

  it("leaves out a card whose plan the installation does not have", () => {
    expect(pricePage([PLANS[0]!], "da").cards.map((c) => c.key)).toEqual(["club"]);
  });
});

describe("the owner's examples", () => {
  it("prices a club of 12, 20, 21 and 40 riders as the plan adds up", () => {
    expect(priceExamples(PLANS[0]!)).toEqual([
      { riders: 12, yearlyDkk: 1200, monthlyDkk: 100 },
      { riders: 20, yearlyDkk: 1200, monthlyDkk: 100 },
      { riders: 21, yearlyDkk: 1250, monthlyDkk: 104 },
      { riders: 40, yearlyDkk: 2200, monthlyDkk: 183 },
    ]);
  });

  it("writes a quota in decimal gigabytes", () => {
    expect(gigabytes(2_000_000_000)).toBe(2);
    expect(gigabytes(20_000_000_000)).toBe(20);
    expect(gigabytes(1_500_000_000)).toBe(1.5);
  });
});
