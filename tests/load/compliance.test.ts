import { describe, expect, it } from "vitest";
import { compliance, matchActivity, type MatchCandidate } from "@/modules/load/compliance";

const TODAY = "2026-09-27";
const YESTERDAY = "2026-09-26";
const TOMORROW = "2026-09-28";

describe("the calendar's colour", () => {
  it.each([
    [49, "red"],
    [50, "yellow"],
    [79, "yellow"],
    [80, "green"],
    [100, "green"],
    [120, "green"],
    [121, "yellow"],
    [150, "yellow"],
    [151, "red"],
  ])("done at %i %% of the planned load is %s", (pct, colour) => {
    expect(
      compliance({ minutes: 60, load: 100 }, { minutes: 60, load: pct }, YESTERDAY, TODAY),
    ).toBe(colour);
  });

  it("goes by load when both sides have one, minutes otherwise", () => {
    // Twice as long but the same load: green by load.
    expect(
      compliance({ minutes: 60, load: 50 }, { minutes: 120, load: 50 }, YESTERDAY, TODAY),
    ).toBe("green");
    // No load on the done side: 48 of 60 minutes is 80 %.
    expect(compliance({ minutes: 60, load: 50 }, { minutes: 48 }, YESTERDAY, TODAY)).toBe("green");
    expect(compliance({ minutes: 60 }, { minutes: 47, load: 40 }, YESTERDAY, TODAY)).toBe("yellow");
  });

  it("is red for a planned session on a day that passed with nothing done", () => {
    expect(compliance({ minutes: 60 }, null, YESTERDAY, TODAY)).toBe("red");
  });

  it("is grey for today and later until something is done", () => {
    expect(compliance({ minutes: 60 }, null, TODAY, TODAY)).toBe("grey");
    expect(compliance({ minutes: 60 }, null, TOMORROW, TODAY)).toBe("grey");
  });

  it("is none for an activity nobody planned", () => {
    expect(compliance(null, { minutes: 60, load: 50 }, YESTERDAY, TODAY)).toBe("none");
  });

  it("is green for anything done against a plan with nothing to measure", () => {
    expect(compliance({ minutes: 0 }, { minutes: 30 }, YESTERDAY, TODAY)).toBe("green");
  });
});

describe("matching an activity to its planned session", () => {
  const sessions: MatchCandidate[] = [
    { id: "long", sport: "bike", onDate: TODAY, minutes: 180, activityId: null },
    { id: "short", sport: "bike", onDate: TODAY, minutes: 60, activityId: null },
    { id: "gym", sport: "strength", onDate: TODAY, minutes: 60, activityId: null },
    { id: "taken", sport: "bike", onDate: TODAY, minutes: 75, activityId: "a1" },
    { id: "yesterday", sport: "bike", onDate: YESTERDAY, minutes: 75, activityId: null },
  ];

  it("picks the same-day, same-sport, unmatched session closest in duration", () => {
    expect(matchActivity({ sport: "bike", onDate: TODAY, minutes: 75 }, sessions)).toBe("short");
    expect(matchActivity({ sport: "bike", onDate: TODAY, minutes: 150 }, sessions)).toBe("long");
    expect(matchActivity({ sport: "strength", onDate: TODAY, minutes: 45 }, sessions)).toBe("gym");
  });

  it("takes the first on a tie", () => {
    expect(matchActivity({ sport: "bike", onDate: TODAY, minutes: 120 }, sessions)).toBe("long");
  });

  it("is null when nothing fits", () => {
    expect(matchActivity({ sport: "other", onDate: TODAY, minutes: 60 }, sessions)).toBeNull();
    expect(matchActivity({ sport: "bike", onDate: TOMORROW, minutes: 60 }, sessions)).toBeNull();
  });
});
