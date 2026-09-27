import { describe, expect, it } from "vitest";
import { barPath, linePath, linearScale, niceStep, niceTicks } from "@/components/charts/scale";

/** The arithmetic under the hand-drawn charts: scales, clean ticks and paths. */
describe("chart arithmetic", () => {
  it("maps a domain onto a range, upside down as SVG wants", () => {
    const y = linearScale([0, 100], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(50)).toBe(100);
    expect(linearScale([5, 5], [10, 0])(5)).toBe(10);
  });

  it("picks steps of 1, 2, 2.5 and 5", () => {
    expect(niceStep(10, 4)).toBe(2.5);
    expect(niceStep(100, 4)).toBe(25);
    expect(niceStep(7, 4)).toBe(2);
    expect(niceStep(0, 4)).toBe(1);
  });

  it("covers the data with clean ticks, below zero too", () => {
    expect(niceTicks(0, 11.2, 4)).toEqual([0, 5, 10, 15]);
    expect(niceTicks(-23, 17, 4)).toEqual([-30, -20, -10, 0, 10, 20]);
    expect(niceTicks(0, 0, 4).length).toBeGreaterThan(1);
  });

  it("breaks a line where the data has a gap", () => {
    expect(linePath([[0, 1], [2, 3], null, [4, 5]])).toBe("M0.0,1.0L2.0,3.0M4.0,5.0");
  });

  it("draws nothing for a bar with no height", () => {
    expect(barPath(0, 10, 100, 100)).toBe("");
    expect(barPath(0, 10, 100, 40)).toMatch(/^M0,100/);
  });
});
