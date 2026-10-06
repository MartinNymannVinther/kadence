import { describe, expect, it } from "vitest";
import { kcalRacing, spread } from "@/modules/calc/energy";
import { carbsPerHour, fluidPerHour } from "@/modules/calc/fuel";

describe("what a race in a bunch costs", () => {
  it("is 12 MET: 12 kcal per kg per hour, shown with ±15 %", () => {
    expect(kcalRacing(60, 2)).toBe(1440);
    const range = spread(1000);
    expect(range.low).toBeCloseTo(850, 5);
    expect(range.high).toBeCloseTo(1150, 5);
  });
});

describe("carbohydrate per hour", () => {
  it("follows the race's length", () => {
    expect(carbsPerHour(0.5, true).kind).toBe("water");
    expect(carbsPerHour(1, true).kind).toBe("small");
    expect(carbsPerHour(2, true)).toMatchObject({ low: 30, high: 60, target: 45, kind: "single" });
    expect(carbsPerHour(3, true)).toMatchObject({
      low: 60,
      high: 90,
      target: 75,
      kind: "multiple",
    });
  });

  it("stops at 60 g an hour without practice in training", () => {
    expect(carbsPerHour(3, false)).toMatchObject({
      low: 60,
      high: 60,
      kind: "single",
      capped: true,
    });
    expect(carbsPerHour(2, false)).toMatchObject({ high: 60, capped: false });
  });

  it("never suggests more than 90 g an hour", () => {
    for (const h of [3, 4, 5, 6]) expect(carbsPerHour(h, true).high).toBeLessThanOrEqual(90);
  });
});

describe("fluid", () => {
  it("drinks more in the heat", () => {
    expect(fluidPerHour(18)).toEqual({ low: 0.4, high: 0.8 });
    expect(fluidPerHour(28)).toEqual({ low: 0.8, high: 1.2 });
  });
});
