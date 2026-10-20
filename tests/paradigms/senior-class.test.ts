import { describe, expect, it } from "vitest";
import { isSeniorIn, riderClass } from "@/modules/season/class";

/**
 * A rider's class and the basis a plan is read for (docs/adr/0091): past
 * U23, or moved to senior by a coach, a rider plans from their training
 * profile, Motionist when none is chosen. A profile on a rider in U17–U23
 * is kept but never read.
 */

const SEASON = 2026; // racing year 2027

describe("riderClass for a senior", () => {
  it("plans an adult without a profile as a motionist", () => {
    expect(riderClass({ birthYear: 1984, categoryOverride: null }, SEASON)).toEqual({
      category: "senior",
      yearInClass: null,
      basis: "senior-motionist",
    });
    expect(
      riderClass({ birthYear: 1984, categoryOverride: null, trainingProfile: null }, SEASON).basis,
    ).toBe("senior-motionist");
  });

  it("plans a supermotionist from that profile", () => {
    const klass = riderClass(
      { birthYear: 1984, categoryOverride: null, trainingProfile: "super-motionist" },
      SEASON,
    );
    expect(klass).toMatchObject({ category: "senior", basis: "senior-super-motionist" });
  });

  it("is senior from the year after U23", () => {
    // Turns 23 in 2027: senior. Turns 22: U23-4.
    expect(riderClass({ birthYear: 2004, categoryOverride: null }, SEASON).basis).toBe(
      "senior-motionist",
    );
    expect(riderClass({ birthYear: 2005, categoryOverride: null }, SEASON).basis).toBe("U23-4");
  });

  it("follows a coach's move to senior, profile and all", () => {
    expect(
      riderClass(
        { birthYear: 2008, categoryOverride: "senior", trainingProfile: "super-motionist" },
        SEASON,
      ),
    ).toMatchObject({ category: "senior", basis: "senior-super-motionist" });
  });

  it("never reads a profile for a rider in U17–U23 or a youth rider", () => {
    expect(
      riderClass(
        { birthYear: 2010, categoryOverride: null, trainingProfile: "super-motionist" },
        SEASON,
      ).basis,
    ).toBe("U19-1");
    expect(
      riderClass(
        { birthYear: 2010, categoryOverride: "U17-2", trainingProfile: "motionist" },
        SEASON,
      ).basis,
    ).toBe("U17-2");
    expect(riderClass({ birthYear: 2015, categoryOverride: null }, SEASON)).toEqual({
      category: "youth",
      yearInClass: null,
      basis: null,
    });
  });
});

describe("whether the training profile's card is shown", () => {
  it("is shown for a senior only", () => {
    expect(isSeniorIn({ birthYear: 1984, categoryOverride: null }, SEASON)).toBe(true);
    expect(isSeniorIn({ birthYear: 2010, categoryOverride: "senior" }, SEASON)).toBe(true);
    expect(isSeniorIn({ birthYear: 2010, categoryOverride: null }, SEASON)).toBe(false);
    expect(isSeniorIn({ birthYear: 2005, categoryOverride: null }, SEASON)).toBe(false);
    expect(isSeniorIn({ birthYear: 2015, categoryOverride: null }, SEASON)).toBe(false);
  });
});
