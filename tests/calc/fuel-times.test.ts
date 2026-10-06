import { describe, expect, it } from "vitest";
import { dayTimes, wrap } from "@/modules/calc/fuel-times";

const at = (h: number, m = 0) => h * 60 + m;

describe("the day on the clock", () => {
  it("puts the meals 3–4 and 1–2 hours before a start at 10, and the main meal 1–2 hours after the finish", () => {
    const t = dayTimes(at(10), 150);
    expect(t.mainMeal).toEqual({ from: at(6), to: at(7) });
    expect(t.snack).toEqual({ from: at(8), to: at(9) });
    expect(t.ride).toEqual({ from: at(10), to: at(12, 30) });
    expect(t.lanes).toEqual([
      { from: at(10), to: at(11) },
      { from: at(11), to: at(12) },
      { from: at(12), to: at(12, 30) },
    ]);
    expect(t.recovery).toEqual({ from: at(12, 30), to: at(13) });
    expect(t.refuel).toEqual({ from: at(12, 30), to: at(16, 30) });
    expect(t.dinner).toEqual({ from: at(13, 30), to: at(14, 30) });
    expect(t.early).toBe(false);
  });

  it("calls a main meal before 6 o'clock early", () => {
    expect(dayTimes(at(9, 30), 120).early).toBe(true);
    expect(dayTimes(at(10), 120).early).toBe(false);
    expect(dayTimes(at(18), 120).early).toBe(false);
  });

  it("wraps past midnight", () => {
    expect(wrap(-60)).toBe(at(23));
    expect(dayTimes(at(23), 120).dinner).toEqual({ from: at(2), to: at(3) });
  });
});
