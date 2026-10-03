import { describe, expect, it } from "vitest";
import { addDaysIso } from "@/core/dates";
import type { CheckinRow, RiderRow } from "@/core/db/schema";
import type { InsightActivity, InsightSession } from "@/modules/insight/gather";
import { riderInsight } from "@/modules/insight/rider";

/**
 * One rider's insight from rows, without a database: the class and its
 * corridor, the load curve, the guardrails that fire, and wellbeing that
 * says nothing when it may not be seen.
 */

const TODAY = "2026-12-10"; // a Thursday
const rider = {
  id: "r",
  name: "Lea",
  birthYear: 2010,
  categoryOverride: null,
  shareWellbeing: false,
} as unknown as RiderRow;

function ride(
  onDate: string,
  hours: number,
  load: number,
  km: number | null = null,
): InsightActivity {
  return {
    id: `a_${onDate}_${hours}`,
    riderId: "r",
    onDate,
    sport: "bike",
    seconds: hours * 3600,
    distanceM: km === null ? null : km * 1000,
    load,
  };
}

const checkin = (onDate: string, over: Partial<CheckinRow> = {}) =>
  ({
    riderId: "r",
    onDate,
    pain: 0,
    ill: 0,
    energy: 4,
    mood: 4,
    sleepHours: 8.5,
    ...over,
  }) as CheckinRow;

describe("a rider's insight", () => {
  it("puts the rider in DCU's class and the week against its corridor", () => {
    const insight = riderInsight(rider, [], [], [], TODAY, true);
    expect(insight.basis).toBe("U19-1");
    expect(insight.corridor).not.toBeNull();
    expect(insight.series).toHaveLength(90);
  });

  it("builds fitness from months of riding and flags a week far above the corridor", () => {
    const acts: InsightActivity[] = [];
    for (let d = 120; d >= 7; d -= 2) acts.push(ride(addDaysIso(TODAY, -d), 1.5, 70));
    acts.push(
      ride("2026-12-07", 6, 300, 170),
      ride("2026-12-08", 5, 250),
      ride("2026-12-09", 5, 250),
    );
    const insight = riderInsight(rider, acts, [], [], TODAY, true);
    expect(insight.today!.fitness).toBeGreaterThan(20);
    const kinds = insight.flags.map((f) => f.kind);
    expect(kinds).toContain("hours_above_corridor");
    expect(kinds).toContain("ramp");
    expect(kinds).toContain("longest_ride");
  });

  it("without a paradigm, the corridor and the longest ride go, and the ramp stays (ADR 0049)", () => {
    const acts: InsightActivity[] = [];
    for (let d = 120; d >= 7; d -= 2) acts.push(ride(addDaysIso(TODAY, -d), 1.5, 70));
    acts.push(
      ride("2026-12-07", 6, 300, 170),
      ride("2026-12-08", 5, 250),
      ride("2026-12-09", 5, 250),
    );
    const insight = riderInsight(rider, acts, [], [], TODAY, true, [], [], null);
    expect(insight.corridor).toBeNull();
    expect(insight.guidance).toBe("none");
    const kinds = insight.flags.map((f) => f.kind);
    expect(kinds).not.toContain("hours_above_corridor");
    expect(kinds).not.toContain("longest_ride");
    expect(kinds).toContain("ramp");
  });

  it("counts planned bike hours still to come toward the week", () => {
    const sessions: InsightSession[] = [
      {
        riderId: "r",
        onDate: "2026-12-12",
        sport: "bike",
        plannedMinutes: 600,
        plannedLoad: 400,
        activityId: null,
      },
    ];
    const insight = riderInsight(rider, [], sessions, [], TODAY, true);
    expect(insight.week.plannedBikeHours).toBe(10);
  });

  it("reads wellbeing and pain only when it may be seen", () => {
    const checks = [
      checkin("2026-12-09", { pain: 3 }),
      checkin("2026-12-10", { pain: 3, mood: 1 }),
    ];
    const seen = riderInsight(rider, [], [], checks, TODAY, true);
    expect(seen.wellbeing?.zone).toBe("red");
    expect(seen.flags.map((f) => f.kind)).toContain("pain");
    const hidden = riderInsight(rider, [], [], checks, TODAY, false);
    expect(hidden.wellbeing).toBeNull();
    expect(hidden.flags.map((f) => f.kind)).not.toContain("pain");
  });

  it("moves a flag a coach has marked afklaret out of the open ones", () => {
    const checks = [checkin("2026-12-10", { pain: 2 })];
    const insight = riderInsight(
      rider,
      [],
      [],
      checks,
      TODAY,
      true,
      [],
      [{ id: "x", kind: "pain", severity: "warn", seen: [{ pain: 2 }] }],
    );
    expect(insight.flags.map((f) => f.kind)).not.toContain("pain");
    expect(insight.resolved.map((r) => r.flag.kind)).toEqual(["pain"]);
    expect(insight.resolved[0]!.resolution.id).toBe("x");
  });
});
