import { describe, expect, it } from "vitest";
import { formatKroner, formatLongDay, yearFrom } from "@/modules/billing/dates";
import {
  isYouth,
  monthlyPrice,
  seasonEndFrom,
  whichPricePlan,
  yearlyPrice,
  youthFreeThrough,
  YOUTH_MAX_AGE,
  type PricePlan,
} from "@/modules/billing/which-plan";

/**
 * Which price a workspace pays and what it comes to (docs/adr/0090,
 * docs/plan-konto-og-priser.md §3.3, Martin's yes of 12 October 2026).
 * The same sum runs in the database (plan_yearly_dkk, drizzle/0052);
 * tests/billing/schema.test.ts holds the two together.
 */

const CLUB: PricePlan = { key: "club", priceYearDkk: 1200, perRiderDkk: 50, includedRiders: 20 };
const PERSON: PricePlan = {
  key: "person",
  priceYearDkk: 290,
  perRiderDkk: null,
  includedRiders: null,
};
const YOUTH: PricePlan = { key: "youth", priceYearDkk: 0, perRiderDkk: null, includedRiders: null };

describe("a club's price", () => {
  it.each([
    [0, 1200],
    [12, 1200],
    [20, 1200],
    [21, 1250],
    [40, 2200],
  ])("for %i riders is %i kr. a year", (riders, price) => {
    expect(yearlyPrice(CLUB, riders)).toBe(price);
  });

  it("is a month as the year divided by twelve, rounded", () => {
    expect(monthlyPrice(1200)).toBe(100);
    expect(monthlyPrice(2200)).toBe(183);
    expect(monthlyPrice(290)).toBe(24);
    expect(monthlyPrice(0)).toBe(0);
  });
});

describe("a person's price", () => {
  it("does not grow with riders", () => {
    expect(yearlyPrice(PERSON, 1)).toBe(290);
    expect(yearlyPrice(PERSON, 5)).toBe(290);
    expect(yearlyPrice(YOUTH, 1)).toBe(0);
  });
});

describe("which plan applies", () => {
  it("is the club's for a club, whatever the riders' ages", () => {
    expect(whichPricePlan({ kind: "club", birthYear: 2012, todayIso: "2026-10-12" })).toBe("club");
    expect(whichPricePlan({ kind: "club", birthYear: null, todayIso: "2026-10-12" })).toBe("club");
  });

  it("is the young rider's for a person at most U19 in the season, by DCU's birth-year rule", () => {
    // Season 2026/27 leads into racing year 2027: U19 turn 17 and 18 in it.
    expect(YOUTH_MAX_AGE).toBe(18);
    expect(isYouth(2009, "2026-10-12")).toBe(true); // turns 18 in 2027: U19-2
    expect(isYouth(2008, "2026-10-12")).toBe(false); // turns 19: U23-1
    expect(isYouth(2014, "2026-10-12")).toBe(true); // younger still
    // In September the season is still 2025/26, racing year 2026.
    expect(isYouth(2008, "2026-09-30")).toBe(true);
    expect(whichPricePlan({ kind: "personal", birthYear: 2009, todayIso: "2026-10-12" })).toBe(
      "youth",
    );
    expect(whichPricePlan({ kind: "personal", birthYear: 1990, todayIso: "2026-10-12" })).toBe(
      "person",
    );
    expect(whichPricePlan({ kind: "personal", birthYear: null, todayIso: "2026-10-12" })).toBe(
      "person",
    );
  });

  it("frees a young rider through 30 September of the year they turn 18", () => {
    expect(youthFreeThrough(2009)).toBe("2027-09-30");
    // The day after is in the season that leads into the year they turn 19.
    expect(isYouth(2009, "2027-09-30")).toBe(true);
    expect(isYouth(2009, "2027-10-01")).toBe(false);
  });

  it("gives a club its first season through the coming 30 September", () => {
    expect(seasonEndFrom("2026-10-12")).toBe("2027-09-30");
    expect(seasonEndFrom("2027-03-01")).toBe("2027-09-30");
    expect(seasonEndFrom("2027-09-30")).toBe("2027-09-30");
    expect(seasonEndFrom("2027-10-01")).toBe("2028-09-30");
  });
});

describe("the days and amounts the pages write", () => {
  it("writes a day out and a sum in kroner in the reader's language", () => {
    expect(formatLongDay("2027-09-30", "da")).toBe("30. september 2027");
    expect(formatLongDay("2027-09-30", "en")).toBe("30 September 2027");
    expect(formatKroner(1200, "da")).toBe("1.200");
    expect(formatKroner(1200, "en")).toBe("1,200");
  });

  it("suggests a year's period through the day before the same date next year", () => {
    expect(yearFrom("2026-10-12")).toBe("2027-10-11");
    expect(yearFrom("2027-01-01")).toBe("2027-12-31");
    expect(yearFrom("2028-02-29")).toBe("2029-02-28");
  });
});
