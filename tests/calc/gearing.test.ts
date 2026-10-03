import { describe, expect, it } from "vitest";
import {
  checkBike,
  gearStatus,
  largestRing,
  ringTable,
  rolloutM,
  smallestCog,
  TYRES,
  validTeeth,
} from "@/modules/calc/gearing";
import { GEAR_PRODUCTS } from "@/modules/calc/gear-products";
import { RACE_RULES } from "@/modules/dcu/races";
import { GEAR_CLASSES, YOUTH_GEARING } from "@/modules/dcu/gearing";

/**
 * The figures in docs/research/klasser-og-gearing.md, section 3.3, worked
 * out again: if the calculator and the research note disagree, one of
 * them is wrong.
 */
describe("DCU's youth gear limits", () => {
  it("are the 2026 rules, and U17 is the same number the coach's tips use", () => {
    expect(YOUTH_GEARING.U11.limitM).toBe(6.18);
    expect(YOUTH_GEARING.U13.limitM).toBe(6.18);
    expect(YOUTH_GEARING.U15.limitM).toBe(6.68);
    expect(YOUTH_GEARING.U17.limitM).toBe(7.33);
    expect(YOUTH_GEARING.U17.limitM).toBe(RACE_RULES.U17.gearingM);
    expect(YOUTH_GEARING.U19.limitM).toBeNull();
  });

  it("every class carries its source", () => {
    for (const c of GEAR_CLASSES) expect(YOUTH_GEARING[c].source.length).toBeGreaterThan(10);
  });
});

describe("rollout", () => {
  it("is chainring over sprocket times the circumference", () => {
    expect(rolloutM(48, 14, 2105)).toBeCloseTo(7.217, 3);
    expect(rolloutM(52, 14, 2136)).toBeCloseTo(7.934, 3);
    expect(rolloutM(38, 11, 2136)).toBeCloseTo(7.379, 3);
  });

  it("a 28 mm tyre takes DCU's own suggestions over the limit", () => {
    // 44×14 in U15 and 32×11 in U13 pass on 25 mm and fail on 28 mm.
    expect(gearStatus(rolloutM(44, 14, TYRES["25"]), 6.68)).not.toBe("over");
    expect(gearStatus(rolloutM(44, 14, TYRES["28"]), 6.68)).toBe("over");
    expect(gearStatus(rolloutM(32, 11, TYRES["25"]), 6.18)).not.toBe("over");
    expect(gearStatus(rolloutM(32, 11, TYRES["28"]), 6.18)).toBe("over");
  });

  it("48×14 on 28 mm passes U17 by about a centimetre, which counts as close", () => {
    expect(gearStatus(rolloutM(48, 14, TYRES["28"]), 7.33)).toBe("close");
    expect(gearStatus(rolloutM(46, 14, TYRES["28"]), 7.33)).toBe("within");
  });

  it("free gearing is free", () => {
    expect(gearStatus(rolloutM(54, 11, TYRES["28"]), null)).toBe("free");
  });
});

describe("the biggest legal chainring and the smallest legal sprocket", () => {
  it("match the research note's table", () => {
    // U17, 25 mm (2105) and 28 mm (2136).
    expect(largestRing(14, 7.33, 2105)).toBe(48);
    expect(largestRing(11, 7.33, 2105)).toBe(38);
    expect(largestRing(11, 7.33, 2136)).toBe(37);
    expect(largestRing(10, 7.33, 2136)).toBe(34);
    // U15.
    expect(largestRing(14, 6.68, 2105)).toBe(44);
    expect(largestRing(14, 6.68, 2136)).toBe(43);
    expect(largestRing(16, 6.68, 2136)).toBe(50);
    // U11–U13.
    expect(largestRing(14, 6.18, 2136)).toBe(40);
    expect(largestRing(10, 6.18, 2136)).toBe(28);
  });

  it("are each other's inverse at the edge", () => {
    for (const circ of Object.values(TYRES)) {
      for (const cog of [10, 11, 12, 13, 14, 15, 16]) {
        const ring = largestRing(cog, 7.33, circ);
        expect(rolloutM(ring, cog, circ)).toBeLessThanOrEqual(7.33);
        expect(rolloutM(ring + 1, cog, circ)).toBeGreaterThan(7.33);
        expect(smallestCog(ring, 7.33, circ)).toBeLessThanOrEqual(cog);
      }
    }
  });

  it("a ring that exactly meets the limit is legal", () => {
    const limit = rolloutM(48, 14, 2105);
    expect(largestRing(14, limit, 2105)).toBe(48);
    expect(smallestCog(48, limit, 2105)).toBe(14);
  });
});

describe("a bike checked against its class", () => {
  it("names the way back within the limit", () => {
    const bike = checkBike(50, 14, TYRES["25"], 7.33);
    expect(bike.status).toBe("over");
    expect(bike.marginM).toBeLessThan(0);
    expect(bike.largestRing).toBe(48);
    expect(bike.smallestCog).toBe(15);
  });

  it("a Magene 50-34 with a Miche 16-30 passes U15", () => {
    const bike = checkBike(50, 16, TYRES["25"], 6.68);
    expect(bike.rolloutM).toBeCloseTo(6.578, 3);
    expect(bike.status).toBe("within");
  });

  it("with free gearing there is no limit to work back from", () => {
    const bike = checkBike(53, 11, TYRES["28"], null);
    expect(bike).toMatchObject({ status: "free", marginM: null, largestRing: null });
  });

  it("the ring table runs over the sprockets given", () => {
    const table = ringTable([11, 14], 6.68, 2105);
    expect(table.map((r) => r.ring)).toEqual([34, 44]);
    for (const row of table) expect(row.rolloutM).toBeLessThanOrEqual(6.68);
  });
});

describe("input and products", () => {
  it("refuses teeth no bike has", () => {
    expect(validTeeth(48, 14)).toBe(true);
    expect(validTeeth(48.5, 14)).toBe(false);
    expect(validTeeth(120, 14)).toBe(false);
    expect(validTeeth(48, 3)).toBe(false);
  });

  it("every product has a source and sensible teeth", () => {
    for (const p of GEAR_PRODUCTS) {
      expect(p.url).toMatch(/^https:\/\//);
      const pairs = p.kind === "cassette" ? p.ranges : p.sets;
      expect(pairs.length).toBeGreaterThan(0);
      for (const [a, b] of pairs) {
        if (p.kind === "cassette") expect(a).toBeLessThan(b);
        else expect(a).toBeGreaterThan(b);
      }
    }
  });

  it("product ids are unique", () => {
    const ids = GEAR_PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
