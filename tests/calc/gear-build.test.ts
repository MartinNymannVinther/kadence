import { describe, expect, it } from "vitest";
import {
  biggestRingUpTo,
  buildFor,
  propose,
  ringProduct,
  sprocketLadder,
} from "@/modules/calc/gear-build";
import { TYRES } from "@/modules/calc/gearing";
import { GEAR_CLASSES, YOUTH_GEARING } from "@/modules/dcu/gearing";

const C25 = TYRES["25"];

describe("the chainring a build names", () => {
  it("is the first product with that big ring, doubles before singles", () => {
    expect(ringProduct(50)).toMatchObject({ family: { id: "shimano" }, set: [50, 34] });
    expect(ringProduct(48)).toMatchObject({ family: { id: "grx" }, set: [48, 31] });
    expect(ringProduct(43)).toMatchObject({ family: { id: "sram" }, set: [43, 30] });
    expect(ringProduct(40)).toMatchObject({ family: { id: "stradaLab" }, set: [40] });
    expect(ringProduct(49)).toBeNull();
  });

  it("falls back to the biggest ring some product carries", () => {
    expect(biggestRingUpTo(49)).toBe(48);
    expect(biggestRingUpTo(37)).toBe(34);
    expect(biggestRingUpTo(33)).toBeNull();
  });
});

describe("a build", () => {
  it("names a Miche cassette, an 11-speed besides, and the ring", () => {
    const build = buildFor(46, 14, C25);
    expect(build.ordinary).toBe(false);
    expect(build.cassette).toMatchObject({ cassette: { id: "micheK12" }, version: [14, 30] });
    expect(build.cassette11).toMatchObject({ cassette: { id: "micheLight" } });
    expect(build.chainring?.family.id).toBe("grx");
    expect(build.rolloutM).toBeCloseTo(6.916, 3);
  });

  it("names no cassette for an ordinary sprocket", () => {
    const build = buildFor(38, 11, C25);
    expect(build).toMatchObject({ ordinary: true, cassette: null, cassette11: null });
  });

  it("falls back to 11-speed where no 12-speed cassette starts on the sprocket", () => {
    const build = buildFor(40, 12, C25);
    expect(build.cassette).toMatchObject({ cassette: { id: "micheLight" }, version: [12, 25] });
    expect(build.cassette11).toBeNull();
  });
});

describe("the proposal for the gear on the sliders", () => {
  it("is the gear itself when it holds", () => {
    const p = propose(46, 14, 7.33, C25);
    expect(p).toMatchObject({ kind: "fits", asked: null, build: { ring: 46, cog: 14 } });
  });

  it("uses the nearest smaller ring when no product carries the one chosen", () => {
    const p = propose(47, 16, 7.33, C25);
    expect(p).toMatchObject({ kind: "fits", asked: 47, build: { ring: 46 } });
  });

  it("over the limit, keeps the ring or keeps the sprocket", () => {
    // U17, 50 × 14 on 25 mm is 7.52 m; 50 × 15 and 48 × 14 hold.
    const p = propose(50, 14, 7.33, C25);
    expect(p.kind).toBe("over");
    if (p.kind !== "over") return;
    expect(p.keepRing).toMatchObject({
      ring: 50,
      cog: 15,
      cassette: { cassette: { id: "dubied" } },
    });
    expect(p.keepCog).toMatchObject({ ring: 48, cog: 14, chainring: { family: { id: "grx" } } });
  });

  it("says when no part we know of holds", () => {
    // U11 with a 10 T sprocket allows 29 T; nothing in the list is that small.
    const p = propose(40, 10, 6.18, C25);
    expect(p).toMatchObject({ kind: "over", keepCog: null, needCog: 14 });
    // 56 T in U11 needs a 20 T sprocket, past every junior cassette.
    expect(propose(56, 14, 6.18, C25)).toMatchObject({ kind: "over", keepRing: null });
  });

  it("free gearing takes the gear as chosen", () => {
    expect(propose(53, 11, null, C25)).toMatchObject({
      kind: "fits",
      build: { ring: 52, ordinary: true },
      asked: 53,
    });
  });

  it("never proposes a build over the limit", () => {
    for (const c of GEAR_CLASSES) {
      const limit = YOUTH_GEARING[c].limitM;
      if (limit === null) continue;
      for (const circumference of Object.values(TYRES))
        for (let cog = 10; cog <= 16; cog++)
          for (let ring = 28; ring <= 56; ring++) {
            const p = propose(ring, cog, limit, circumference);
            const builds = p.kind === "fits" ? [p.build] : [p.keepRing, p.keepCog];
            for (const b of builds) if (b) expect(b.rolloutM).toBeLessThanOrEqual(limit + 1e-9);
          }
    }
  });
});

describe("the sprockets drawn for a cassette", () => {
  it("run from the smallest to the largest, one per speed", () => {
    const ladder = sprocketLadder(14, 30, 12);
    expect(ladder).toHaveLength(12);
    expect(ladder[0]).toBe(14);
    expect(ladder.at(-1)).toBe(30);
    for (let i = 1; i < ladder.length; i++)
      expect(ladder[i]).toBeGreaterThanOrEqual(ladder[i - 1]!);
  });
});

describe("two rings in front or one", () => {
  it("keeps to the kind chosen", () => {
    expect(biggestRingUpTo(44, "double")).toBe(43);
    expect(biggestRingUpTo(44, "single")).toBe(44);
    expect(ringProduct(48, "single")).toMatchObject({ family: { id: "stradaLab" }, set: [48] });
    expect(ringProduct(34, "double")).toBeNull();
  });

  it("builds with one ring when asked", () => {
    const p = propose(50, 14, 7.33, C25, "single");
    expect(p.kind).toBe("over");
    if (p.kind !== "over") return;
    expect(p.keepRing?.chainring?.family.id).toBe("stradaLab");
    expect(p.keepCog).toMatchObject({ ring: 48, chainring: { family: { id: "stradaLab" } } });
  });

  it("says when no ring of the kind is small enough", () => {
    // U15 with 11 T allows 34 T: no double set, but a Strada Lab 34 T.
    expect(propose(34, 11, 6.68, C25, "double")).toMatchObject({
      kind: "fits",
      build: { ring: 34, chainring: null },
    });
    expect(propose(34, 11, 6.68, C25, "single")).toMatchObject({
      build: { chainring: { family: { id: "stradaLab" } } },
    });
  });
});
