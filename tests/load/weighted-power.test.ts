import { describe, expect, it } from "vitest";
import { bestMeanPower, bestMeanPowers, weightedPower } from "@/modules/load/weighted-power";

const steady = (watts: number, seconds: number) => Array.from({ length: seconds }, () => watts);

/** One minute at `on`, one minute at `off`, for `minutes` minutes. */
function onOff(on: number, off: number, minutes: number): number[] {
  const out: number[] = [];
  for (let m = 0; m < minutes; m++) out.push(...steady(m % 2 === 0 ? on : off, 60));
  return out;
}

describe("weighted power", () => {
  it("is the wattage itself for a steady ride", () => {
    expect(weightedPower(steady(200, 3600))).toBeCloseTo(200, 6);
  });

  it("weighs surges above their average", () => {
    const ride = onOff(300, 100, 60);
    const average = ride.reduce((a, b) => a + b, 0) / ride.length;
    const weighted = weightedPower(ride)!;
    expect(average).toBe(200);
    expect(weighted).toBeGreaterThan(200);
    expect(weighted).toBeLessThan(300);
  });

  it("counts a second without power as coasting at 0 W", () => {
    const withGaps = [...steady(250, 600), ...Array.from({ length: 120 }, () => null)];
    const withZeros = [...steady(250, 600), ...steady(0, 120)];
    expect(weightedPower(withGaps)).toBeCloseTo(weightedPower(withZeros)!, 9);
    expect(weightedPower(withGaps)).toBeLessThan(250);
  });

  it("is the average of a ride shorter than the 30-second window", () => {
    expect(weightedPower([100, 200, 300])).toBe(200);
  });

  it("is unknown for an empty stream", () => {
    expect(weightedPower([])).toBeNull();
  });
});

describe("best efforts", () => {
  const ride = [...steady(200, 100), ...steady(800, 5), ...steady(200, 100)];

  it("finds the highest average over the duration", () => {
    expect(bestMeanPower(ride, 5)).toBe(800);
    expect(bestMeanPower(ride, 60)).toBeCloseTo((5 * 800 + 55 * 200) / 60, 9);
  });

  it("is unknown when the ride is shorter than the duration", () => {
    expect(bestMeanPower(ride, 300)).toBeNull();
  });

  it("keeps whole watts for every duration the ride was long enough for", () => {
    expect(bestMeanPowers(ride)).toEqual({ 5: 800, 60: 250 });
    expect(Object.keys(bestMeanPowers(steady(180, 3600)))).toEqual([
      "5",
      "60",
      "300",
      "1200",
      "3600",
    ]);
  });
});
