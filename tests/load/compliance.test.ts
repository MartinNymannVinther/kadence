import { describe, expect, it } from "vitest";
import {
  RPE_FAR_HIGH_PCT,
  RPE_FAR_LOW_PCT,
  compliance,
  complianceRatio,
  feltFarOff,
  matchActivity,
  type MatchCandidate,
} from "@/modules/load/compliance";

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

describe("how it felt counts only when it is far off (Martin, 13 October 2026)", () => {
  const plan = { minutes: 60, load: 100 };
  const colour = (load: number, method: "power" | "hr" | "rpe" | null | undefined, minutes = 60) =>
    compliance(plan, { minutes, load, method }, YESTERDAY, TODAY);

  it("sets the far bounds at under 50 % and over 200 % of the planned load", () => {
    expect([RPE_FAR_LOW_PCT, RPE_FAR_HIGH_PCT]).toEqual([50, 200]);
    expect([49, 50, 100, 200, 201].map(feltFarOff)).toEqual([true, false, false, false, true]);
  });

  it("reads load by power and heart rate, as before", () => {
    for (const method of ["power", "hr"] as const) {
      expect(colour(60, method)).toBe("yellow");
      expect(colour(160, method)).toBe("red");
      expect(complianceRatio(plan, { minutes: 60, load: 60, method })).toEqual({
        by: "load",
        pct: 60,
      });
    }
  });

  it("reads minutes when an RPE load is near the plan", () => {
    // Felt 60 % or 190 % of the plan, ridden the planned hour: green by minutes.
    expect(colour(60, "rpe")).toBe("green");
    expect(colour(190, "rpe")).toBe("green");
    expect(colour(50, "rpe")).toBe("green");
    expect(colour(200, "rpe")).toBe("green");
    expect(complianceRatio(plan, { minutes: 45, load: 60, method: "rpe" })).toEqual({
      by: "minutes",
      pct: 75,
    });
    // Off by minutes stays off by minutes.
    expect(colour(100, "rpe", 25)).toBe("red");
  });

  it("reads load when an RPE load is far off, low or high", () => {
    expect(complianceRatio(plan, { minutes: 60, load: 49, method: "rpe" })).toEqual({
      by: "load",
      pct: 49,
    });
    expect(colour(49, "rpe")).toBe("red");
    expect(colour(201, "rpe")).toBe("red");
    expect(colour(10, "rpe")).toBe("red");
  });

  it("reads a strength session the same way: it is RPE by nature", () => {
    const strength = { minutes: 45, load: 40 };
    const done = (load: number) => ({ minutes: 45, load, method: "rpe" as const });
    expect(compliance(strength, done(25), YESTERDAY, TODAY)).toBe("green");
    expect(compliance(strength, done(15), YESTERDAY, TODAY)).toBe("red");
    expect(compliance(strength, done(90), YESTERDAY, TODAY)).toBe("red");
  });

  it("keeps the load for an RPE ride when the plan has no minutes to read instead", () => {
    expect(
      complianceRatio({ minutes: 0, load: 100 }, { minutes: 60, load: 60, method: "rpe" }),
    ).toEqual({ by: "load", pct: 60 });
  });

  it("reads load as before for a side with no method", () => {
    expect(colour(60, undefined)).toBe("yellow");
    expect(colour(60, null)).toBe("yellow");
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
