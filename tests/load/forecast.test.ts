import { describe, expect, it } from "vitest";
import { addDaysIso } from "@/core/dates";
import {
  FORECAST_DEFAULT_DAYS,
  FORECAST_MAX_DAYS,
  forecastForm,
  loadSeries,
  plannedDayLoad,
} from "@/modules/load";

/** Form ahead: the chart's own model, fed the plan, up to the next A or B race. */

const TODAY = "2026-09-28";
const seed = { fitness: 50, fatigue: 60 };
const ride = (inDays: number, load: number | null, minutes = 60) => ({
  onDate: addDaysIso(TODAY, inDays),
  sport: "bike",
  plannedMinutes: minutes,
  plannedLoad: load,
});

describe("form ahead", () => {
  it("runs the chart's model from the end of today over the planned load", () => {
    const planned = [ride(1, 80), ride(3, 120)];
    const { days } = forecastForm(TODAY, seed, planned, []);
    expect(days[0]!.date).toBe(addDaysIso(TODAY, 1));
    expect(days).toHaveLength(FORECAST_DEFAULT_DAYS);
    expect(days).toEqual(
      loadSeries(
        planned.map((p) => ({ date: p.onDate, load: p.plannedLoad })),
        addDaysIso(TODAY, 1),
        addDaysIso(TODAY, FORECAST_DEFAULT_DAYS),
        seed,
      ),
    );
  });

  it("stops at the next A or B race within eight weeks, and says which", () => {
    const races = [
      { title: "DM", date: addDaysIso(TODAY, 30), priority: "A" as const },
      { title: "Cup", date: addDaysIso(TODAY, 10), priority: "B" as const },
      { title: "Far", date: addDaysIso(TODAY, FORECAST_MAX_DAYS + 5), priority: "A" as const },
    ];
    const { days, race } = forecastForm(TODAY, seed, [], races);
    expect(race?.title).toBe("Cup");
    expect(days.at(-1)!.date).toBe(addDaysIso(TODAY, 10));
  });

  it("rests into form: a taper with nothing planned lifts form day by day", () => {
    const { days } = forecastForm(TODAY, seed, [], []);
    for (let i = 1; i < days.length; i++)
      expect(days[i]!.form).toBeGreaterThanOrEqual(days[i - 1]!.form);
    expect(days.at(-1)!.form).toBeGreaterThan(0);
  });

  it("counts a planned session without a load by its minutes", () => {
    expect(plannedDayLoad(ride(1, 90))).toBe(90);
    expect(plannedDayLoad(ride(1, null, 120))).toBeGreaterThan(0);
    expect(plannedDayLoad({ ...ride(1, null, 60), sport: "strength" })).toBeGreaterThan(
      plannedDayLoad(ride(1, null, 60)),
    );
  });

  it("ignores what is already past, and what lies beyond the race", () => {
    const race = { title: "B", date: addDaysIso(TODAY, 5), priority: "B" as const };
    const a = forecastForm(TODAY, seed, [ride(0, 500), ride(9, 500)], [race]);
    const b = forecastForm(TODAY, seed, [], [race]);
    expect(a.days).toEqual(b.days);
  });
});
