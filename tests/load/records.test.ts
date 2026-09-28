import { describe, expect, it } from "vitest";
import { bestCurve, inPeriod, records, recordsSetBy, type RecordSource } from "@/modules/load";

/** Records: the ride that holds the best, per period, the rider against themselves. */

const TODAY = "2026-09-28";
const ride = (
  id: string,
  onDate: string,
  best: Record<string, number>,
  extra: Partial<RecordSource> = {},
): RecordSource => ({
  id,
  onDate,
  title: id,
  sport: "bike",
  bestPowers: best,
  distanceM: 50_000,
  ascentM: 300,
  movingSeconds: 7200,
  ...extra,
});
const rides = [
  ride("a", "2026-09-20", { "5": 700, "60": 350, "1200": 250 }, { distanceM: 80_000 }),
  ride("b", "2026-06-01", { "5": 800, "60": 330, "1200": 260 }, { ascentM: 900 }),
  ride("c", "2025-05-01", { "5": 650, "60": 400, "1200": 240 }, { movingSeconds: 5 * 3600 }),
  ride("run", "2026-09-25", { "5": 900 }, { sport: "other" }),
];

describe("records", () => {
  it("takes the best per duration from whichever ride holds it, bikes only", () => {
    const curve = bestCurve(inPeriod(rides, "all", TODAY));
    expect(curve.get(5)).toMatchObject({ watts: 800, activityId: "b" });
    expect(curve.get(60)).toMatchObject({ watts: 400, activityId: "c" });
    expect(curve.get(1200)).toMatchObject({ watts: 260, activityId: "b" });
  });

  it("narrows by period: a month, half a year, a year, ever", () => {
    expect(records(rides, "month", TODAY).power.map((r) => r.activityId)).toEqual(["a", "a", "a"]);
    expect(records(rides, "halfYear", TODAY).power.find((r) => r.seconds === 5)?.activityId).toBe(
      "b",
    );
    expect(records(rides, "year", TODAY).power.find((r) => r.seconds === 60)?.watts).toBe(350);
    expect(records(rides, "all", TODAY).power.find((r) => r.seconds === 60)?.watts).toBe(400);
  });

  it("names the longest ride, the most climbing and the longest time, with their rides", () => {
    const all = records(rides, "all", TODAY);
    expect(all.longestKm).toMatchObject({ value: 80, activityId: "a" });
    expect(all.mostClimbingM).toMatchObject({ value: 900, activityId: "b" });
    expect(all.longestHours).toMatchObject({ value: 5, activityId: "c" });
  });

  it("gives a tie to the ride that set it first", () => {
    const tie = [ride("x", "2026-09-01", { "5": 700 }), ride("y", "2026-09-10", { "5": 700 })];
    expect(bestCurve(tie).get(5)?.activityId).toBe("x");
  });

  it("says which durations one ride set the record on", () => {
    const curve = bestCurve(inPeriod(rides, "all", TODAY));
    expect(recordsSetBy(curve, "b").sort((p, q) => p - q)).toEqual([5, 1200]);
    expect(recordsSetBy(curve, "a")).toEqual([]);
  });
});
