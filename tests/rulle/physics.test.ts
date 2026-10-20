import { describe, expect, it } from "vitest";
import { nextSpeed, PHYSICS, steadySpeed, swayAt } from "@/modules/rulle";

const kmh = (metresPerSecond: number) => metresPerSecond * 3.6;

describe("the speed watts hold", () => {
  it("is about 39 km/h for 250 W on the flat", () => {
    expect(kmh(steadySpeed(250, 0))).toBeGreaterThan(38);
    expect(kmh(steadySpeed(250, 0))).toBeLessThan(40);
  });

  it("is 46 to 48 km/h for 420 W on the flat", () => {
    expect(kmh(steadySpeed(420, 0))).toBeGreaterThan(46);
    expect(kmh(steadySpeed(420, 0))).toBeLessThan(48);
  });

  it("is a climber's pace for 250 W up 8 %", () => {
    expect(kmh(steadySpeed(250, 0.08))).toBeGreaterThan(12.5);
    expect(kmh(steadySpeed(250, 0.08))).toBeLessThan(14.5);
  });

  it("rolls down a 5 % hill without a pedal stroke, and stands still on the flat", () => {
    expect(kmh(steadySpeed(0, -0.05))).toBeGreaterThan(45);
    expect(kmh(steadySpeed(0, -0.05))).toBeLessThan(55);
    expect(steadySpeed(0, 0)).toBe(0);
  });

  it("goes up with the watts and down with the slope", () => {
    expect(steadySpeed(300, 0)).toBeGreaterThan(steadySpeed(200, 0));
    expect(steadySpeed(200, 0.04)).toBeLessThan(steadySpeed(200, 0));
  });
});

describe("the speed from one moment to the next", () => {
  it("settles at the steady speed", () => {
    let v = 0;
    for (let s = 0; s < 120; s++) v = nextSpeed(v, 250, 0, 1);
    expect(v).toBeCloseTo(steadySpeed(250, 0), 1);
  });

  it("slows down when the rider stops pedalling, and never goes backwards", () => {
    const after = nextSpeed(10, 0, 0, 5);
    expect(after).toBeLessThan(10);
    expect(after).toBeGreaterThan(0);
    expect(nextSpeed(0.2, 0, 0.1, 10)).toBe(0);
  });

  it("takes a long gap in small steps rather than one leap", () => {
    expect(nextSpeed(10, 250, 0, 3)).toBeCloseTo(
      nextSpeed(nextSpeed(10, 250, 0, 1.5), 250, 0, 1.5),
      6,
    );
  });

  it("never passes the fastest a Danish road allows", () => {
    expect(nextSpeed(24, 3000, -0.15, 30)).toBeLessThanOrEqual(PHYSICS.maxSpeed);
  });
});

describe("the rider's line", () => {
  it("keeps right and wanders within the lane", () => {
    for (let m = 0; m < 5_000; m += 7) {
      expect(swayAt(m)).toBeGreaterThan(0.6);
      expect(swayAt(m)).toBeLessThan(2.1);
    }
  });
});
