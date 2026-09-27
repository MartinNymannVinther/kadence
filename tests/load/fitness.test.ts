import { describe, expect, it } from "vitest";
import { addDaysIso } from "@/core/dates";
import { loadSeries, weeklyTotals, type DayLoad } from "@/modules/load/fitness";

const START = "2026-01-01";

/** `days` days of `load` a day from `from`. */
function constant(load: number, days: number, from = START): DayLoad[] {
  return Array.from({ length: days }, (_, i) => ({ date: addDaysIso(from, i), load }));
}

describe("fitness, fatigue and form", () => {
  const month = constant(60, 30);
  const end = addDaysIso(START, 29);

  it("builds fatigue fast and fitness slowly over a constant month", () => {
    const series = loadSeries(month, START, end);
    expect(series).toHaveLength(30);
    const last = series[29]!;
    // A 7-day average has all but caught up; a 42-day one is about half-way.
    expect(last.fatigue).toBeCloseTo(60 * (1 - Math.exp(-30 / 7)), 0);
    expect(last.fitness).toBeCloseTo(60 * (1 - Math.exp(-30 / 42)), 0);
    expect(last.form).toBeLessThan(-25);
  });

  it("brings form back above zero after a rest week", () => {
    const series = loadSeries(month, START, addDaysIso(end, 8));
    const afterRest = series[series.length - 1]!;
    expect(afterRest.load).toBe(0);
    expect(afterRest.form).toBeGreaterThan(0);
    expect(afterRest.fatigue).toBeLessThan(afterRest.fitness);
  });

  it("does not move today's form with today's training", () => {
    const rested = loadSeries(month, START, addDaysIso(end, 1));
    const ridden = loadSeries(
      [...month, { date: addDaysIso(end, 1), load: 200 }],
      START,
      addDaysIso(end, 1),
    );
    expect(ridden.at(-1)!.form).toBe(rested.at(-1)!.form);
    expect(ridden.at(-1)!.fatigue).toBeGreaterThan(rested.at(-1)!.fatigue);
  });

  it("sums several activities on one day and reads a missing day as 0", () => {
    const split = loadSeries(
      [
        { date: START, load: 30 },
        { date: START, load: 30 },
        { date: addDaysIso(START, 2), load: null },
      ],
      START,
      addDaysIso(START, 2),
    );
    const whole = loadSeries([{ date: START, load: 60 }], START, addDaysIso(START, 2));
    expect(split).toEqual(whole);
    expect(split.map((d) => d.load)).toEqual([60, 0, 0]);
  });

  it("warms up on loads before the first day shown", () => {
    const shown = loadSeries(month, addDaysIso(START, 20), end);
    expect(shown).toHaveLength(10);
    expect(shown[0]!.fitness).toBeGreaterThan(20);
  });

  it("starts from a seed, which stands for everything before it", () => {
    const series = loadSeries(month, addDaysIso(START, 20), end, { fitness: 10, fatigue: 30 });
    expect(series[0]!.form).toBe(-20);
    expect(series[0]!.fitness).toBeLessThan(12);
  });

  it("is empty when the range runs backwards", () => {
    expect(loadSeries(month, end, START)).toEqual([]);
  });
});

describe("weekly totals", () => {
  // 2026-09-21 is a Monday.
  const activities = [
    { date: "2026-09-21", seconds: 7200, load: 100, sport: "bike" as const },
    { date: "2026-09-23", seconds: 5400, load: 80, sport: "bike" as const },
    { date: "2026-09-24", seconds: 3600, load: 60, sport: "strength" as const },
    { date: "2026-09-27", seconds: 1800, load: null, sport: "other" as const },
    { date: "2026-10-06", seconds: 3600, load: 50, sport: "bike" as const },
  ];

  it("counts hours, bike hours, load and sessions per ISO week", () => {
    expect(weeklyTotals(activities)).toEqual([
      { monday: "2026-09-21", hours: 5, bikeHours: 3.5, load: 240, sessions: 4 },
      { monday: "2026-10-05", hours: 1, bikeHours: 1, load: 50, sessions: 1 },
    ]);
  });

  it("lists every week of a range, empty ones included, and nothing outside it", () => {
    const weeks = weeklyTotals(activities, "2026-09-28", "2026-10-11");
    expect(weeks.map((w) => w.monday)).toEqual(["2026-09-28", "2026-10-05"]);
    expect(weeks[0]).toEqual({
      monday: "2026-09-28",
      hours: 0,
      bikeHours: 0,
      load: 0,
      sessions: 0,
    });
    expect(weeks[1]!.sessions).toBe(1);
  });
});
