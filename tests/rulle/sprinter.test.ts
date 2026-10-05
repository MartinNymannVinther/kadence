import { describe, expect, it } from "vitest";
import {
  criticalPower,
  jumpAt,
  nextSpeed,
  reserveAfter,
  SPRINTER,
  wattsFor,
} from "@/modules/rulle";

describe("the sprinter's legs (ADR 0050)", () => {
  it("holds 300 W for as long as he likes and has 18 kJ above it, from 600 W for a minute and 360 W for five", () => {
    const { cp, wPrime } = criticalPower({ watts: 600, seconds: 60 }, { watts: 360, seconds: 300 });
    expect(cp).toBeCloseTo(300, 6);
    expect(wPrime).toBeCloseTo(18_000, 6);
    expect(SPRINTER.cp).toBeCloseTo(300, 6);
    // Both efforts empty the reserve, just.
    for (const [watts, seconds] of [
      [600, 60],
      [360, 300],
    ] as const) {
      let reserve: number = SPRINTER.wPrime;
      for (let s = 0; s < seconds - 1; s++) reserve = reserveAfter(reserve, watts, 1);
      expect(reserve).toBeGreaterThan(0);
      expect(reserveAfter(reserve, watts, 1)).toBeCloseTo(0, 6);
    }
  });

  it("wins the reserve back below 300 W, the faster the emptier it is, never past full", () => {
    const empty = reserveAfter(0, 200, 10) - 0;
    const half = reserveAfter(9000, 200, 10) - 9000;
    expect(empty).toBeGreaterThan(half);
    expect(half).toBeGreaterThan(0);
    expect(reserveAfter(SPRINTER.wPrime, 0, 600)).toBe(SPRINTER.wPrime);
    expect(reserveAfter(100, 900, 10)).toBe(0);
  });

  it("is small: about 0.82 of the 70 kg rider's air", () => {
    expect(SPRINTER.air).toBeGreaterThan(0.8);
    expect(SPRINTER.air).toBeLessThan(0.84);
  });

  it("knows the watts a speed takes: the physics turned round", () => {
    for (const [from, watts, grade, drag] of [
      [10, 250, 0, 1],
      [6, 400, 0.06, 0.67],
      [14, 700, -0.02, 0.5],
    ] as const) {
      const to = nextSpeed(from, watts, grade, 0.05, SPRINTER.massKg, drag);
      expect(wattsFor(from, to, 0.05, grade, SPRINTER.massKg, drag)).toBeCloseTo(watts, -1);
    }
    // To slow down he freewheels: no watts, never fewer.
    expect(wattsFor(12, 6, 1, 0, SPRINTER.massKg, 1)).toBe(0);
  });

  it("jumps from 15 m out and comes down on the line, highest halfway", () => {
    expect(jumpAt(200)).toBe(0);
    expect(jumpAt(15)).toBe(0);
    expect(jumpAt(7.5)).toBeCloseTo(SPRINTER.jump, 6);
    expect(jumpAt(3)).toBeGreaterThan(0);
    expect(jumpAt(0)).toBe(0);
  });
});
