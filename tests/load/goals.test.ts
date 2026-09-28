import { describe, expect, it } from "vitest";
import { dcuWinterGoal, goalShare, progressOf } from "@/modules/load/goals";

/** Process goals: counted from what was done, and DCU's winter goal proposed. */

const acts = [
  { onDate: "2026-11-03", sport: "strength", movingSeconds: 3600 },
  { onDate: "2026-11-05", sport: "strength", movingSeconds: 3600 },
  { onDate: "2026-11-06", sport: "bike", movingSeconds: 3 * 3600 + 600 },
  { onDate: "2026-11-08", sport: "bike", movingSeconds: 2 * 3600 },
  { onDate: "2026-10-30", sport: "strength", movingSeconds: 3600 },
];
const goal = (kind: Parameters<typeof progressOf>[0]["kind"], extra = {}) => ({
  kind,
  startsOn: "2026-11-01",
  endsOn: "2027-03-15",
  minHours: null,
  progress: 0,
  ...extra,
});

describe("goals", () => {
  it("counts sessions, hours and long rides in the period, and keeps a manual count", () => {
    expect(progressOf(goal("strength_sessions"), acts)).toBe(2);
    expect(progressOf(goal("bike_sessions"), acts)).toBe(2);
    expect(progressOf(goal("bike_hours"), acts)).toBeCloseTo(5.2, 1);
    expect(progressOf(goal("long_rides", { minHours: 3 }), acts)).toBe(1);
    expect(progressOf(goal("long_rides", { minHours: 2 }), acts)).toBe(2);
    expect(progressOf(goal("manual", { progress: 7 }), acts)).toBe(7);
  });

  it("caps the share at done", () => {
    expect(goalShare(15, 30)).toBe(0.5);
    expect(goalShare(40, 30)).toBe(1);
  });

  it("proposes DCU's 30 strength sessions from 1 November to 15 March for U17 and U19", () => {
    expect(dcuWinterGoal("U19", "2026-09-28")).toEqual({
      kind: "strength_sessions",
      target: 30,
      startsOn: "2026-11-01",
      endsOn: "2027-03-15",
      winter: 2026,
    });
    expect(dcuWinterGoal("U17", "2027-02-01")!.winter).toBe(2026);
    expect(dcuWinterGoal("U17", "2027-03-16")!.winter).toBe(2027);
    expect(dcuWinterGoal("U23", "2026-09-28")).toBeNull();
  });
});
