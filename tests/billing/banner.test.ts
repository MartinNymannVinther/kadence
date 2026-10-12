import { describe, expect, it } from "vitest";
import { stateWords } from "@/components/billing/plan-words";
import { planBanner, trialLine } from "@/modules/billing/banner";
import { daysLeft, lastDay } from "@/modules/billing/dates";

/**
 * What the pages say about a plan (docs/adr/0090): a stripe at the top of
 * every page when the workspace may only be read; a quiet line with a
 * trial's days under Indstillinger, and the stripe only in its last week;
 * nothing for a free or a paid workspace.
 *
 * Monday 12 October 2026, noon in Copenhagen (summer time, UTC+2).
 */

const NOW = new Date("2026-10-12T10:00:00Z");
/** The midnight that ends a Copenhagen day in October (still summer time until the 25th). */
const endOf = (day: string) => new Date(`${day}T22:00:00Z`);

const base = { trialEndsAt: null, paidUntil: null, freeReason: null, freeUntil: null };

describe("the last day an end covers", () => {
  it("is the Copenhagen day before the midnight that ends it", () => {
    expect(lastDay(endOf("2026-10-20"))).toBe("2026-10-20");
    expect(lastDay(new Date("2026-10-20T13:30:00Z"))).toBe("2026-10-20");
    expect(daysLeft(endOf("2026-10-20"), NOW)).toBe(8);
    expect(daysLeft(endOf("2026-10-12"), NOW)).toBe(0);
    expect(daysLeft(endOf("2026-10-10"), NOW)).toBe(-2);
  });
});

describe("the stripe at the top", () => {
  it("says a trial has ended, and what still works, whenever the workspace is read only", () => {
    expect(planBanner({ ...base, plan: "expired", trialEndsAt: endOf("2026-10-10") }, NOW)).toEqual(
      { kind: "expired", wasTrial: true, lastDay: "2026-10-10" },
    );
    expect(
      planBanner(
        {
          ...base,
          plan: "expired",
          trialEndsAt: endOf("2025-10-01"),
          paidUntil: endOf("2026-10-01"),
        },
        NOW,
      ),
    ).toEqual({ kind: "expired", wasTrial: false, lastDay: "2026-10-01" });
  });

  it("waits until a trial's last week", () => {
    expect(
      planBanner({ ...base, plan: "trial", trialEndsAt: endOf("2026-10-20") }, NOW),
    ).toBeNull();
    expect(planBanner({ ...base, plan: "trial", trialEndsAt: endOf("2026-10-19") }, NOW)).toEqual({
      kind: "trialEnding",
      daysLeft: 7,
      lastDay: "2026-10-19",
    });
    expect(planBanner({ ...base, plan: "trial", trialEndsAt: endOf("2026-10-12") }, NOW)).toEqual({
      kind: "trialEnding",
      daysLeft: 0,
      lastDay: "2026-10-12",
    });
  });

  it("is not there for a free or a paid workspace", () => {
    expect(planBanner({ ...base, plan: "free" }, NOW)).toBeNull();
    expect(planBanner({ ...base, plan: "paid", paidUntil: endOf("2026-10-14") }, NOW)).toBeNull();
  });
});

describe("the line under Indstillinger", () => {
  it("counts a trial's days at any time, and is not there otherwise", () => {
    expect(trialLine({ ...base, plan: "trial", trialEndsAt: endOf("2026-11-11") }, NOW)).toEqual({
      daysLeft: 30,
      lastDay: "2026-11-11",
    });
    expect(trialLine({ ...base, plan: "paid", paidUntil: endOf("2026-11-11") }, NOW)).toBeNull();
    expect(trialLine({ ...base, plan: "free" }, NOW)).toBeNull();
  });
});

describe("the sentence on Abonnement", () => {
  it("names the state and its day", () => {
    expect(stateWords({ ...base, plan: "free" }, NOW)).toEqual({
      key: "free",
      day: null,
      days: null,
    });
    expect(
      stateWords(
        {
          ...base,
          plan: "free",
          freeReason: "first-season",
          freeUntil: new Date("2027-09-30T22:00:00Z"),
        },
        NOW,
      ),
    ).toEqual({ key: "freeFirstSeason", day: "2027-09-30", days: null });
    expect(
      stateWords(
        { ...base, plan: "free", freeReason: "youth", freeUntil: endOf("2027-09-30") },
        NOW,
      ).key,
    ).toBe("freeYouth");
    expect(
      stateWords(
        { ...base, plan: "free", freeReason: "pilot", freeUntil: endOf("2027-01-31") },
        NOW,
      ).key,
    ).toBe("freeUntil");
    expect(stateWords({ ...base, plan: "trial", trialEndsAt: endOf("2026-10-15") }, NOW)).toEqual({
      key: "trial",
      day: "2026-10-15",
      days: 3,
    });
    expect(stateWords({ ...base, plan: "paid", paidUntil: endOf("2027-10-11") }, NOW).key).toBe(
      "paid",
    );
    expect(
      stateWords({ ...base, plan: "expired", trialEndsAt: endOf("2026-10-01") }, NOW).key,
    ).toBe("expiredTrial");
    expect(
      stateWords(
        {
          ...base,
          plan: "expired",
          trialEndsAt: endOf("2025-10-01"),
          paidUntil: endOf("2026-10-01"),
        },
        NOW,
      ),
    ).toEqual({ key: "expiredPaid", day: "2026-10-01", days: null });
  });
});
