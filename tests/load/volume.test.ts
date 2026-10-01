import { describe, expect, it } from "vitest";
import { CORRIDOR_BAND, monthHours, weeklyCorridor } from "@/modules/dcu";
import { dcuState, seasonMonths, volumeOf, type SeasonFrame } from "@/modules/season/volume";

/**
 * The four numbers (ADR 0040): DCU, the coach's goal, planned and done,
 * for any range. DCU's side must agree with the weekly corridor the
 * guardrails already use; the goal is the coach's months spread the same
 * way; only the bike counts; and a range that crosses into a season
 * without a plan has no goal rather than a part of one.
 */

const U17: SeasonFrame = {
  basis: "U17-1",
  // A coach who wants ten hours more than DCU in November, and DCU's hours elsewhere.
  goal: [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((month) => ({
    month,
    hours: monthHours("U17-1", month) + (month === 11 ? 10 : 0),
  })),
};
const frameOf = (season: number): SeasonFrame =>
  season === 2026 ? U17 : { basis: "U17-2", goal: null };

const WEEK = { from: "2026-11-09", to: "2026-11-15" };

describe("a week's four numbers", () => {
  const volume = volumeOf({
    range: WEEK,
    frameOf,
    today: "2026-11-11",
    sessions: [
      { onDate: "2026-11-10", sport: "bike", plannedMinutes: 90, done: true },
      { onDate: "2026-11-11", sport: "bike", plannedMinutes: 60, done: false },
      { onDate: "2026-11-12", sport: "strength", plannedMinutes: 60, done: false },
      { onDate: "2026-11-14", sport: "bike", plannedMinutes: 180, done: false },
      { onDate: "2026-11-16", sport: "bike", plannedMinutes: 600, done: false },
    ],
    activities: [
      { onDate: "2026-11-10", sport: "bike", seconds: 100 * 60 },
      { onDate: "2026-11-12", sport: "strength", seconds: 3600 },
      { onDate: "2026-11-08", sport: "bike", seconds: 3600 },
    ],
  });

  it("reads DCU's side as the weekly corridor does", () => {
    const corridor = weeklyCorridor("U17-1", WEEK.from);
    expect(volume.dcu?.target).toBeCloseTo(corridor.target, 9);
    expect(volume.dcu?.low).toBeCloseTo(corridor.target * (1 - CORRIDOR_BAND), 9);
    expect(volume.basis).toBe("U17-1");
  });

  it("spreads the coach's month over its days", () => {
    // November: DCU's 21 h plus the coach's 10, over 30 days, for 7 of them.
    expect(volume.goal).toBeCloseTo(((21 + 10) / 30) * 7, 9);
  });

  it("counts the bike only, inside the week", () => {
    expect(volume.planned).toBeCloseTo((90 + 60 + 180) / 60, 9);
    expect(volume.done).toBeCloseTo(100 / 60, 9);
  });

  it("expects what was done plus what is still to ride from today", () => {
    expect(volume.expected).toBeCloseTo((100 + 60 + 180) / 60, 9);
    expect(dcuState(volume)).toBe("inside");
  });
});

describe("a range across the season's turn", () => {
  it("has no goal where the next season has no plan, and DCU's October break as nothing", () => {
    const volume = volumeOf({
      range: { from: "2027-09-27", to: "2027-10-03" },
      frameOf: (season) => (season === 2026 ? U17 : { basis: "U17-2", goal: null }),
      today: "2027-09-27",
      sessions: [],
      activities: [],
    });
    expect(volume.goal).toBeNull();
    // Four September days of U17-1's 30 hours; October is "pause + frit".
    expect(volume.dcu?.target).toBeCloseTo((30 / 30) * 4, 9);
  });

  it("has no DCU number for a rider outside DCU's classes", () => {
    const volume = volumeOf({
      range: WEEK,
      frameOf: () => ({ basis: null, goal: null }),
      today: "2026-11-11",
      sessions: [],
      activities: [],
    });
    expect(volume.dcu).toBeNull();
    expect(dcuState(volume)).toBeNull();
  });
});

describe("a season's months", () => {
  it("run October to September, each whole", () => {
    const months = seasonMonths(2026);
    expect(months.map((m) => m.month)).toEqual([10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(months[0]).toEqual({ month: 10, from: "2026-10-01", to: "2026-10-31" });
    expect(months[4]).toEqual({ month: 2, from: "2027-02-01", to: "2027-02-28" });
  });

  it("add up to the season's DCU hours", () => {
    const total = seasonMonths(2026)
      .map((m) =>
        volumeOf({ range: m, frameOf, today: "2026-10-01", sessions: [], activities: [] }),
      )
      .reduce((sum, v) => sum + (v.dcu?.target ?? 0), 0);
    expect(total).toBeCloseTo(429, 6);
  });
});
