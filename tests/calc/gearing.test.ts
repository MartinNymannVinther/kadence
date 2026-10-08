import { describe, expect, it } from "vitest";
import {
  checkBike,
  gearStatus,
  largestRing,
  pitchRadiusMm,
  ringTable,
  rolloutM,
  smallestCog,
  TYRES,
  validTeeth,
  wheelTurns,
} from "@/modules/calc/gearing";
import {
  CASSETTES,
  cassetteFor,
  CHAINRINGS,
  ORDINARY_COGS,
  ringsFor,
} from "@/modules/calc/gear-products";
import { RACE_RULES } from "@/modules/dcu/races";
import { GEAR_CLASS_AGES, GEAR_CLASSES, YOUTH_GEARING } from "@/modules/dcu/gearing";

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

  it("each class is two birth years, in order, and the top one runs on", () => {
    // Sporstlige_regler_2026 ch. 7 §§ 1.15–1.18; research note 1.1.
    expect(GEAR_CLASS_AGES.U15).toEqual({ from: 13, to: 14 });
    expect(GEAR_CLASS_AGES.U17).toEqual({ from: 15, to: 16 });
    expect(GEAR_CLASS_AGES.U19).toEqual({ from: 17, to: null });
    GEAR_CLASSES.forEach((c, i) => {
      const { from, to } = GEAR_CLASS_AGES[c];
      expect(from).toBe(9 + 2 * i);
      if (to !== null) expect(to).toBe(from + 1);
    });
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

  it("the wheel turns chainring over sprocket times per pedal turn", () => {
    expect(wheelTurns(50, 14)).toBeCloseTo(3.571, 3);
    expect(rolloutM(50, 14, 2105)).toBeCloseTo((wheelTurns(50, 14) * 2105) / 1000, 9);
  });

  it("draws a chainring and a sprocket at their real size", () => {
    // A 53 T ring's pitch diameter is about 214.4 mm; an 11 T sprocket's about 45.1 mm.
    expect(2 * pitchRadiusMm(53)).toBeCloseTo(214.4, 1);
    expect(2 * pitchRadiusMm(11)).toBeCloseTo(45.1, 1);
    expect(pitchRadiusMm(50)).toBeGreaterThan(pitchRadiusMm(34));
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
    for (const c of CASSETTES) {
      expect(c.url).toMatch(/^https:\/\//);
      expect(c.versions.length).toBeGreaterThan(0);
      for (const [small, large] of c.versions) expect(small).toBeLessThan(large);
    }
    for (const f of CHAINRINGS) {
      expect(f.url).toMatch(/^https:\/\//);
      for (const set of f.sets) {
        expect(set.length).toBe(f.kind === "double" ? 2 : 1);
        if (f.kind === "double") expect(set[0]).toBeGreaterThan(set[1]!);
      }
      // Biggest first, so the first set that fits is the one nearest the limit.
      const bigs = f.sets.map(([big]) => big!);
      expect(bigs).toEqual([...bigs].sort((a, b) => b - a));
    }
  });

  it("product ids are unique", () => {
    const ids = [...CASSETTES, ...CHAINRINGS].map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("the suggested build", () => {
  it("names no cassette for an ordinary 10 or 11", () => {
    expect(ORDINARY_COGS).toEqual([10, 11]);
    for (const cog of ORDINARY_COGS) {
      expect(cassetteFor(cog, 12)).toBeNull();
      expect(cassetteFor(cog, 11)).toBeNull();
    }
  });

  it("suggests Miche first, and another maker only where Miche has none", () => {
    expect(cassetteFor(14, 12)).toMatchObject({ cassette: { id: "micheK12" }, version: [14, 30] });
    expect(cassetteFor(16, 12)).toMatchObject({ cassette: { id: "micheK12" }, version: [16, 30] });
    expect(cassetteFor(13, 12)).toMatchObject({ cassette: { id: "dubied" }, version: [13, 34] });
    expect(cassetteFor(15, 12)).toMatchObject({ cassette: { id: "dubied" }, version: [15, 28] });
    expect(cassetteFor(12, 12)).toBeNull();
    for (const cog of [12, 13, 14, 15, 16])
      expect(cassetteFor(cog, 11)?.cassette.id).toBe("micheLight");
  });

  it("offers only chainrings that keep the sprocket within the class", () => {
    // U17, 25 mm, 14 T: at most 48 T (research note 3.3).
    const u17 = Object.fromEntries(
      ringsFor(14, 7.33, TYRES["25"]).map((f) => [f.family.id, f.sets.map((s) => s.join("-"))]),
    );
    expect(u17).toEqual({
      shimano: [],
      grx: ["48-31", "46-30"],
      sram: ["48-35", "46-33", "43-30"],
      stradaLab: ["48", "46", "44", "42", "40", "38", "34"],
      sram1x: ["46", "44", "42", "40", "38"],
    });
    for (const fit of ringsFor(16, 6.68, TYRES["28"]))
      for (const [big] of fit.sets)
        expect(rolloutM(big!, 16, TYRES["28"])).toBeLessThanOrEqual(6.68);
  });

  it("with free gearing every chainring fits", () => {
    for (const fit of ringsFor(11, null, TYRES["25"])) expect(fit.sets).toEqual(fit.family.sets);
  });
});
