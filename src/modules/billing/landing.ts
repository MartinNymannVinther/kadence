import { monthlyPrice } from "./which-plan";

/**
 * What the front page offers, by `SIGNUP` and `BILLING` (docs/plan-konto-
 * og-priser.md §2.6, docs/adr/0090). Pure: the page reads the settings and
 * the price list and renders what this answers, so all six combinations
 * are tested here rather than by rendering the page.
 *
 * - `open` (an open installation, or an empty one): an account at once,
 *   as before.
 * - `individuals` (door 2 open, ADR 0088): "Opret konto" first, a line
 *   for a team that applies, and both ways in under "To måder"; with
 *   billing on, the price in one line under the buttons — the trial and
 *   the cheapest paid plan a month, or "Gratis at komme i gang" without a
 *   trial — and never a number that is not in price_plans.
 * - `closed`: an application, as before.
 *
 * The price page is linked from the header and the footer whenever
 * billing is on, whatever the door.
 */

export type LandingDoor = "closed" | "individuals" | "open";

export type LandingInput = {
  door: LandingDoor;
  billing: boolean;
  trialDays: number;
  /** Today's yearly prices in whole kroner, from price_plans. */
  yearlyPrices: number[];
};

export type LandingPrice =
  { kind: "trial"; days: number; monthlyDkk: number } | { kind: "free" } | null;

export type LandingCopy = {
  /** The header's primary button: an account, or an application. */
  headerKey: "register" | "apply";
  /** The hero's first button. */
  heroKey: "ctaPrimary" | "ctaApply";
  /** "Er I et hold? Så ansøger I først", under the hero's buttons. */
  teamLine: boolean;
  /** The alone card's button under "To måder", and the team card's, if any. */
  aloneKey: "aloneCta" | "aloneCreate";
  teamApply: boolean;
  /** The price line under the hero's buttons. */
  price: LandingPrice;
  /** Links to /priser in the header and the footer. */
  pricesLink: boolean;
};

/** The cheapest plan that costs anything, a month in whole kroner; null when every plan is free. */
export function cheapestMonthly(yearlyPrices: number[]): number | null {
  const paid = yearlyPrices.filter((p) => p > 0);
  return paid.length === 0 ? null : monthlyPrice(Math.min(...paid));
}

export function landingCopy(input: LandingInput): LandingCopy {
  const individuals = input.door === "individuals";
  const account = input.door !== "closed";
  return {
    headerKey: account ? "register" : "apply",
    heroKey: account ? "ctaPrimary" : "ctaApply",
    teamLine: individuals,
    aloneKey: individuals ? "aloneCreate" : "aloneCta",
    teamApply: individuals,
    price: individuals && input.billing ? priceLine(input) : null,
    pricesLink: input.billing,
  };
}

function priceLine(input: LandingInput): LandingPrice {
  const monthly = cheapestMonthly(input.yearlyPrices);
  if (input.trialDays > 0 && monthly !== null)
    return { kind: "trial", days: input.trialDays, monthlyDkk: monthly };
  return { kind: "free" };
}

/** The open price page's address in the reader's language: /priser, /en/prices. */
export function pricesPath(locale: string): "/priser" | "/prices" {
  return locale === "en" ? "/prices" : "/priser";
}
