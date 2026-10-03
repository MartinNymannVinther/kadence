import { describe, expect, it } from "vitest";
import { addDaysIso } from "@/core/dates";
import type { RiderRow } from "@/core/db/schema";
import { DCU_BIKE_SESSIONS } from "@/modules/dcu/bike-sessions";
import { riderInsight } from "@/modules/insight/rider";
import {
  countIntensity,
  guardrails,
  intensityShares,
  midZoneFlag,
  sessionGoal,
  stepZone,
  threeZoneOf,
  weeklyIntensity,
  worseThan,
  type IntensitySession,
} from "@/modules/load";
import { profileFor } from "@/modules/paradigms";
import type { BikeStructure, Step, Target } from "@/modules/workouts/structure";

/**
 * "Lav intensitet først" (ADR 0053): sessions counted once each in the
 * zone they are meant for, race days as hard ones, and the profile's one
 * flag when the middle zone grows large in the months it has numbers for.
 */

const step = (seconds: number, target: Target, intent: Step["intent"] = "steady"): Step => ({
  kind: "step",
  intent,
  seconds,
  target,
});
const zone = (z: number): Target => ({ kind: "zone", zone: z });
const bike = (...steps: BikeStructure["steps"]): BikeStructure => ({ kind: "bike", steps });
const dcu = (key: string) => DCU_BIKE_SESSIONS.find((s) => s.key === key)!.structure;

describe("three zones", () => {
  it("folds Kadence's seven as 1–2 low, 3–4 between and 5–7 high", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((z) => threeZoneOf(z as 1))).toEqual([
      "low",
      "low",
      "mid",
      "mid",
      "high",
      "high",
      "high",
    ]);
  });

  it("reads a step's zone from any target, and an open effort as none", () => {
    expect(stepZone(step(60, zone(4)))).toBe(4);
    expect(stepZone(step(60, { kind: "ftp_pct", low: 88, high: 94 }))).toBe(4);
    expect(stepZone(step(60, { kind: "hr_pct", low: 70, high: 80 }))).toBe(1);
    expect(stepZone(step(60, { kind: "hr_pct", low: 82, high: 88 }))).toBe(2);
    expect(stepZone(step(60, { kind: "rpe", value: 9 }))).toBe(5);
    expect(stepZone(step(60, { kind: "open" }, "warmup"))).toBe(2);
    expect(stepZone(step(60, { kind: "open" }, "work"))).toBeNull();
  });
});

describe("a session's goal", () => {
  it("counts DCU's own example sessions where a coach would", () => {
    expect(sessionGoal(dcu("dcu-base-60"))).toBe("low");
    expect(sessionGoal(dcu("dcu-medium-2x15"))).toBe("mid");
    expect(sessionGoal(dcu("dcu-at-3x8"))).toBe("mid");
    expect(sessionGoal(dcu("dcu-vo2-3x3"))).toBe("high");
    // Ten times 30 seconds is five minutes high: a hard session.
    expect(sessionGoal(dcu("dcu-anaerobic-10x30"))).toBe("high");
    // Sprints are open efforts with long rest: the rest is what is counted.
    expect(sessionGoal(dcu("dcu-sprint-5x10"))).toBe("low");
  });

  it("is the highest zone held five minutes, else where most of the session is", () => {
    const endurance = step(3 * 3600, zone(2));
    expect(sessionGoal(bike(endurance, step(4 * 60, zone(5), "work")))).toBe("low");
    expect(sessionGoal(bike(endurance, step(5 * 60, zone(5), "work")))).toBe("high");
    expect(sessionGoal(bike(step(4 * 60, zone(4), "work")))).toBe("mid");
  });

  it("says nothing for a session without a target, or one off the bike", () => {
    expect(sessionGoal(bike())).toBeNull();
    expect(sessionGoal(bike(step(3600, { kind: "open" }, "work")))).toBeNull();
    expect(sessionGoal({ kind: "other", text: "Løb", minutes: 40 })).toBeNull();
  });
});

describe("counting a stretch of days", () => {
  const s = (onDate: string, structure: IntensitySession["structure"]) => ({ onDate, structure });
  const sessions = [
    s("2026-12-07", dcu("dcu-base-60")),
    s("2026-12-08", dcu("dcu-at-3x8")),
    s("2026-12-09", bike()),
    s("2026-12-10", { kind: "strength", warmup: "", exercises: [], progression: [], minutes: 60 }),
    s("2026-12-14", dcu("dcu-vo2-3x3")),
  ];

  it("counts each session once, a race day as hard, and the unreadable apart", () => {
    const races = [
      { startsOn: "2026-12-12", endsOn: "2026-12-13" },
      // A team race and the rider's own on the same day are one race day.
      { startsOn: "2026-12-13", endsOn: "2026-12-13" },
      { startsOn: "2026-12-01", endsOn: "2026-12-06" },
    ];
    expect(countIntensity(sessions, races, "2026-12-07", "2026-12-13")).toEqual({
      low: 1,
      mid: 1,
      high: 2,
      races: 2,
      unknown: 1,
    });
  });

  it("gives whole-percent shares, and none with nothing counted", () => {
    const count = { low: 7, mid: 1, high: 1, races: 0, unknown: 0 };
    expect(intensityShares(count)).toEqual({ low: 78, mid: 11, high: 11 });
    expect(intensityShares({ low: 0, mid: 0, high: 0, races: 0, unknown: 3 })).toBeNull();
  });

  it("splits it into Monday-weeks", () => {
    const weeks = weeklyIntensity(sessions, [], ["2026-12-07", "2026-12-14"]);
    expect(weeks.map((w) => [w.monday, w.count.low, w.count.mid, w.count.high])).toEqual([
      ["2026-12-07", 1, 1, 0],
      ["2026-12-14", 0, 0, 1],
    ]);
  });
});

describe("the profile and its flag", () => {
  const count = (low: number, mid: number, high: number) => ({
    low,
    mid,
    high,
    races: 0,
    unknown: 0,
  });

  it("has numbers from November to February only", () => {
    expect([11, 12, 1, 2].every((m) => profileFor(m)?.midMax === 10)).toBe(true);
    expect([3, 4, 6, 9, 10].every((m) => profileFor(m) === null)).toBe(true);
  });

  it("names a middle zone well past the ceiling, with enough sessions to say so", () => {
    expect(midZoneFlag(null)).toBeNull();
    expect(midZoneFlag({ count: count(4, 2, 1), midMax: 10 })).toBeNull();
    expect(midZoneFlag({ count: count(17, 3, 0), midMax: 10 })).toBeNull();
    expect(midZoneFlag({ count: count(13, 3, 0), midMax: 10 })).toEqual({
      kind: "mid_zone",
      severity: "info",
      values: { mid: 19, sessions: 16, limit: 10 },
    });
    expect(guardrails({ bikeHours: 0, intensity: { count: count(10, 6, 2), midMax: 10 } })).toEqual(
      [expect.objectContaining({ kind: "mid_zone" })],
    );
  });

  it("reopens a resolution only when ten points more lie in the middle", () => {
    const flag = midZoneFlag({ count: count(13, 3, 0), midMax: 10 })!;
    expect(worseThan(flag, { mid: 12 })).toBe(false);
    expect(worseThan(flag, { mid: 9 })).toBe(true);
  });
});

describe("in a rider's insight", () => {
  const rider = {
    id: "r",
    name: "Lea",
    birthYear: 2010,
    categoryOverride: null,
    shareWellbeing: false,
  } as unknown as RiderRow;
  // Four weeks, two threshold sessions and three easy ones in each.
  const plan = (firstMonday: string) =>
    [0, 1, 2, 3].flatMap((w) =>
      [0, 1, 2, 3, 4].map((d) => ({
        onDate: addDaysIso(firstMonday, 7 * w + d),
        structure: d < 2 ? dcu("dcu-at-3x8") : dcu("dcu-base-60"),
      })),
    );
  const flags = (today: string, intensity: Parameters<typeof riderInsight>[9]) =>
    riderInsight(rider, [], [], [], today, true, [], [], null, intensity).flags.map((f) => f.kind);

  it("flags the middle zone when the team uses the profile, in its months", () => {
    // Thursday 10 December: the four weeks run from Monday 16 November.
    const sessions = plan("2026-11-16");
    expect(flags("2026-12-10", { sessions, races: [] })).toContain("mid_zone");
    expect(flags("2026-12-10", null)).not.toContain("mid_zone");
  });

  it("stays quiet outside them", () => {
    const sessions = plan("2027-03-15");
    expect(flags("2027-04-08", { sessions, races: [] })).not.toContain("mid_zone");
  });
});
