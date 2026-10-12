import { describe, expect, it } from "vitest";
import { seniorWeeklyCorridor } from "@/modules/paradigms";
import { referenceHours, volumeOf, type SeasonFrame } from "@/modules/season/volume";

/**
 * The week's legend for an adult on a training profile (docs/adr/0095):
 * "Motionist" stands beside the profile's own hours — never "ingen
 * DCU-årgang" — also where the team plans without a paradigm, because
 * the profile is the adult's choice and Kadence's numbers, not DCU's. A
 * youth rider with no class, and a youth rider in a team without a
 * paradigm, still have no reference number.
 */

const WEEK = { from: "2026-11-02", to: "2026-11-08" };
const input = (basis: SeasonFrame["basis"]) => ({
  range: WEEK,
  frameOf: () => ({ basis, goal: null }),
  sessions: [],
  activities: [],
  today: "2026-11-04",
});

describe("a senior's week against the profile", () => {
  it("reads the profile's corridor with or without the team's paradigm", () => {
    const corridor = seniorWeeklyCorridor("senior-motionist", WEEK.from);
    for (const paradigm of [undefined, null]) {
      const volume = volumeOf({ ...input("senior-motionist"), paradigm });
      expect(volume.dcu?.target).toBeCloseTo(corridor.target, 5);
      expect(volume.dcu?.low).toBeCloseTo(corridor.low, 5);
      expect(volume.dcu?.high).toBeCloseTo(corridor.high, 5);
    }
    // The team's choice is still told apart: the strength line reads it.
    expect(volumeOf({ ...input("senior-motionist"), paradigm: null }).guided).toBe(false);
  });

  it("is the same rule the month and season views read (referenceHours)", () => {
    const frameOf = () => ({ basis: "senior-motionist" as const, goal: null });
    const november = { from: "2026-11-01", to: "2026-11-30" };
    expect(referenceHours(november, frameOf, null).dcu).toBeCloseTo(16, 5);
    const youth = () => ({ basis: "U19-1" as const, goal: null });
    expect(referenceHours(november, youth, null).dcu).toBeNull();
  });

  it("has October's break for a senior too, rather than no reference", () => {
    const october = volumeOf({
      ...input("senior-super-motionist"),
      range: { from: "2026-10-12", to: "2026-10-18" },
      paradigm: null,
    });
    expect(october.dcu).toEqual({ low: 0, target: 0, high: 0 });
  });

  it("leaves a youth rider without a class, or without the team's paradigm, with none", () => {
    expect(volumeOf(input(null)).dcu).toBeNull();
    expect(volumeOf({ ...input("U19-1"), paradigm: null }).dcu).toBeNull();
  });
});
