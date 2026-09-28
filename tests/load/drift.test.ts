import { describe, expect, it } from "vitest";
import { DRIFT_MIN_SECONDS, heartRateDrift, POWER_CURVE_SECONDS, powerCurve } from "@/modules/load";

describe("heart-rate drift", () => {
  const steady = (n: number, w: number, hr: (s: number) => number) => ({
    power: Array.from({ length: n }, () => w),
    hr: Array.from({ length: n }, (_, s) => hr(s)),
  });

  it("is zero when the pulse holds at the same watt", () => {
    const { power, hr } = steady(3600, 200, () => 140);
    expect(heartRateDrift(power, hr)).toBe(0);
  });

  it("is positive when the pulse creeps up at the same watt", () => {
    const { power, hr } = steady(3600, 200, (s) => (s < 1800 ? 140 : 150));
    // 200/140 against 200/150: the second half's watt per beat is 6.7 % lower.
    expect(heartRateDrift(power, hr)).toBe(6.7);
  });

  it("says nothing about a short ride or one without power", () => {
    const short = steady(DRIFT_MIN_SECONDS - 1, 200, () => 140);
    expect(heartRateDrift(short.power, short.hr)).toBeNull();
    const coasting = steady(3600, 0, () => 140);
    expect(heartRateDrift(coasting.power, coasting.hr)).toBeNull();
  });

  it("says nothing about an uneven ride: intervals first, easy after, is the plan, not drift", () => {
    const power = Array.from({ length: 3600 }, (_, s) => (s < 1800 ? 300 : 150));
    const hr = Array.from({ length: 3600 }, (_, s) => (s < 1800 ? 175 : 150));
    expect(heartRateDrift(power, hr)).toBeNull();
  });

  it("uses only the seconds with both a pulse and a watt", () => {
    const { power, hr } = steady(3600, 200, () => 140);
    const gaps = hr.map((v, s) => (s % 2 === 0 ? null : v));
    expect(heartRateDrift(power, gaps)).toBe(0);
  });
});

describe("the power curve", () => {
  it("holds a best watt for every duration the ride reached, falling with time", () => {
    const power = Array.from({ length: 1200 }, (_, s) => (s < 10 ? 800 : 200));
    const curve = powerCurve(power);
    expect(curve["1"]).toBe(800);
    expect(curve["10"]).toBe(800);
    expect(curve["1200"]).toBe(205);
    expect(curve["1800"]).toBeUndefined();
    const values = POWER_CURVE_SECONDS.filter((s) => s <= 1200).map((s) => curve[String(s)]!);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeLessThanOrEqual(values[i - 1]!);
  });

  it("includes the five durations the tiles show", () => {
    const curve = powerCurve(Array.from({ length: 3600 }, () => 200));
    for (const s of [5, 60, 300, 1200, 3600]) expect(curve[String(s)]).toBe(200);
  });
});
