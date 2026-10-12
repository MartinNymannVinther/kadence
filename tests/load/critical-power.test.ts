import { describe, expect, it } from "vitest";
import { fitCriticalPower, plausibleFit } from "@/modules/load/critical-power";

/** Critical power fitted through a rider's best 3–20 minutes (docs/adr/0094). */

const curve = (cp: number, wPrime: number, seconds: number[]) =>
  seconds.map((s) => ({ seconds: s, watts: cp + wPrime / s }));

describe("critical power", () => {
  it("finds CP and W′ from points on the hyperbola", () => {
    const fit = fitCriticalPower(curve(280, 18_000, [180, 300, 600, 900, 1200]))!;
    expect(fit.cp).toBeCloseTo(280, 5);
    expect(fit.wPrime).toBeCloseTo(18_000, 3);
    expect(fit.r2).toBeCloseTo(1, 6);
    expect(plausibleFit(fit, 295)).toBe(true);
  });

  it("needs three durations", () => {
    expect(fitCriticalPower(curve(280, 18_000, [300, 1200]))).toBeNull();
  });

  it("refuses a W′ no rider has: the long efforts were not all-out", () => {
    const fit = fitCriticalPower(curve(150, 60_000, [180, 300, 1200]))!;
    expect(plausibleFit(fit, 200)).toBe(false);
  });

  it("refuses a poor fit", () => {
    const fit = fitCriticalPower([
      { seconds: 180, watts: 300 },
      { seconds: 300, watts: 340 },
      { seconds: 600, watts: 260 },
      { seconds: 1200, watts: 280 },
    ])!;
    expect(fit.r2).toBeLessThan(0.95);
    expect(plausibleFit(fit, 280)).toBe(false);
  });
});
