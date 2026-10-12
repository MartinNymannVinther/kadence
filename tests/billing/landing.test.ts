import { describe, expect, it } from "vitest";
import {
  cheapestMonthly,
  landingCopy,
  pricesPath,
  type LandingDoor,
} from "@/modules/billing/landing";

/**
 * The front page by SIGNUP and BILLING (docs/plan-konto-og-priser.md
 * §2.6, docs/adr/0090): what each of the six combinations offers, and
 * that the price line is the trial and the cheapest paid plan from
 * price_plans, never a number of its own. The page renders what this
 * answers (src/app/[locale]/page.tsx).
 */

const SEEDED = [1200, 290, 0]; // club, person, youth (drizzle/0052)
const copy = (door: LandingDoor, billing: boolean, trialDays = 30, yearlyPrices = SEEDED) =>
  landingCopy({ door, billing, trialDays, yearlyPrices });

describe("the front page", () => {
  it("closed, without billing: an application, as before, and no price", () => {
    expect(copy("closed", false)).toEqual({
      headerKey: "apply",
      heroKey: "ctaApply",
      teamLine: false,
      aloneKey: "aloneCta",
      teamApply: false,
      price: null,
      pricesLink: false,
    });
  });

  it("closed, with billing: an application, and the price page linked but no price line", () => {
    expect(copy("closed", true)).toMatchObject({
      headerKey: "apply",
      heroKey: "ctaApply",
      teamLine: false,
      price: null,
      pricesLink: true,
    });
  });

  it("individuals, without billing: an account first, a team applies, no price", () => {
    expect(copy("individuals", false)).toEqual({
      headerKey: "register",
      heroKey: "ctaPrimary",
      teamLine: true,
      aloneKey: "aloneCreate",
      teamApply: true,
      price: null,
      pricesLink: false,
    });
  });

  it("individuals, with billing and a trial: the trial and the cheapest paid plan a month", () => {
    expect(copy("individuals", true)).toEqual({
      headerKey: "register",
      heroKey: "ctaPrimary",
      teamLine: true,
      aloneKey: "aloneCreate",
      teamApply: true,
      // 290 kr. a year is 24 kr. a month; the free youth plan is not the cheapest *paid* one.
      price: { kind: "trial", days: 30, monthlyDkk: 24 },
      pricesLink: true,
    });
    expect(copy("individuals", true, 14, [600, 1200]).price).toEqual({
      kind: "trial",
      days: 14,
      monthlyDkk: 50,
    });
  });

  it("individuals, with billing and no trial: free to get started", () => {
    expect(copy("individuals", true, 0).price).toEqual({ kind: "free" });
  });

  it("individuals, with billing and nothing to pay for: free to get started", () => {
    expect(copy("individuals", true, 30, [0]).price).toEqual({ kind: "free" });
  });

  it("open, without billing: an account at once, as before", () => {
    expect(copy("open", false)).toEqual({
      headerKey: "register",
      heroKey: "ctaPrimary",
      teamLine: false,
      aloneKey: "aloneCta",
      teamApply: false,
      price: null,
      pricesLink: false,
    });
  });

  it("open, with billing: as before, with the price page linked", () => {
    expect(copy("open", true)).toMatchObject({
      headerKey: "register",
      teamLine: false,
      price: null,
      pricesLink: true,
    });
  });
});

describe("the numbers behind it", () => {
  it("takes the cheapest plan that costs anything, a month in whole kroner", () => {
    expect(cheapestMonthly([1200, 290, 0])).toBe(24);
    expect(cheapestMonthly([0])).toBeNull();
    expect(cheapestMonthly([])).toBeNull();
  });

  it("finds the price page in the reader's language", () => {
    expect(pricesPath("da")).toBe("/priser");
    expect(pricesPath("en")).toBe("/prices");
  });
});
