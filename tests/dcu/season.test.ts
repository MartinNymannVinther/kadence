import { describe, expect, it } from "vitest";
import {
  CLASS_BASES,
  PHASE_INFO,
  PHASES,
  buildSeasonPlan,
  compareToDcu,
  monthHours,
  phaseOf,
  seasonHours,
} from "@/modules/dcu";

describe("the season's phases", () => {
  it("follow DCU's order through the year", () => {
    expect([10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(phaseOf)).toEqual([
      "break",
      "distance",
      "distance",
      "base_intervals",
      "base_intervals",
      "peak_intervals",
      "season",
      "season",
      "season",
      "season",
      "season",
      "season",
    ]);
  });

  it("cover every month exactly once", () => {
    const months = PHASES.flatMap((p) => PHASE_INFO[p].months).sort((a, b) => a - b);
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(() => phaseOf(13)).toThrow(RangeError);
  });
});

describe("a season plan from DCU", () => {
  it("has twelve months, from October's break to September", () => {
    const plan = buildSeasonPlan("U19-2", 2025);
    expect(plan.basis).toBe("U19-2");
    expect(plan.seasonStartYear).toBe(2025);
    expect(plan.months.map((m) => m.month)).toEqual([10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(plan.months[0]).toMatchObject({ month: 10, hours: 0, phase: "break" });
    expect(plan.months[1]).toMatchObject({ month: 11, hours: 38, phase: "distance" });
    expect(plan.months[5]).toMatchObject({ month: 3, hours: 68, phase: "peak_intervals" });
    for (const m of plan.months) expect(m.note.length).toBeGreaterThan(0);
  });

  it.each(CLASS_BASES)("matches DCU's table for %s", (basis) => {
    const plan = buildSeasonPlan(basis, 2025);
    for (const m of plan.months) expect(m.hours).toBe(monthHours(basis, m.month));
    expect(plan.months.reduce((sum, m) => sum + m.hours, 0)).toBe(seasonHours(basis));
  });
});

describe("a plan compared with DCU", () => {
  it("shows no deviation for DCU's own plan", () => {
    const plan = buildSeasonPlan("U17-1", 2025);
    for (const row of compareToDcu(plan.months, "U17-1")) {
      expect(row.diff).toBe(0);
      expect(row.diffPct).toBe(row.month === 10 ? null : 0);
    }
  });

  it("shows each month's deviation in hours and percent", () => {
    const plan = buildSeasonPlan("U17-1", 2025);
    const changed = plan.months.map((m) =>
      m.month === 11 ? { ...m, hours: 25.2 } : m.month === 3 ? { ...m, hours: 40 } : m,
    );
    const rows = compareToDcu(changed, "U17-1");
    const november = rows.find((r) => r.month === 11)!;
    expect(november).toMatchObject({ planned: 25.2, dcu: 21 });
    expect(november.diff).toBeCloseTo(4.2, 10);
    expect(november.diffPct).toBeCloseTo(20, 10);
    expect(rows.find((r) => r.month === 3)).toMatchObject({
      planned: 40,
      dcu: 50,
      diff: -10,
      diffPct: -20,
    });
  });

  it("has no percent for October, where DCU plans no hours", () => {
    expect(compareToDcu([{ month: 10, hours: 4 }], "U23-1")).toEqual([
      { month: 10, planned: 4, dcu: 0, diff: 4, diffPct: null },
    ]);
  });

  it("compares against another class's hours when asked", () => {
    const plan = buildSeasonPlan("U17-2", 2025);
    const rows = compareToDcu(plan.months, "U19-1");
    expect(rows.find((r) => r.month === 1)).toMatchObject({ planned: 50, dcu: 56, diff: -6 });
  });
});
