import { describe, expect, it } from "vitest";
import {
  ageInRaceYear,
  basisParts,
  classFor,
  isClassBasis,
  raceYearOf,
  seasonStartYear,
} from "@/modules/dcu";

describe("the season a date belongs to", () => {
  it("starts with October's break and ends with September", () => {
    expect(seasonStartYear("2025-09-30")).toBe(2024);
    expect(seasonStartYear("2025-10-01")).toBe(2025);
    expect(seasonStartYear("2025-11-15")).toBe(2025);
    expect(seasonStartYear("2025-12-31")).toBe(2025);
    expect(seasonStartYear("2026-01-01")).toBe(2025);
    expect(seasonStartYear("2026-09-30")).toBe(2025);
    expect(seasonStartYear("2026-10-01")).toBe(2026);
  });

  it("leads into the next calendar year's racing", () => {
    expect(raceYearOf(2025)).toBe(2026);
  });

  it("refuses a date that is not yyyy-mm-dd", () => {
    expect(() => seasonStartYear("1/10/2025")).toThrow(RangeError);
  });
});

describe("a rider's class by birth year", () => {
  it("takes the age the rider turns in the racing year", () => {
    expect(ageInRaceYear(2010, 2025)).toBe(16);
    expect(classFor(2011, 2025)).toEqual({ category: "U17", yearInClass: 1, basis: "U17-1" });
    expect(classFor(2010, 2025)).toEqual({ category: "U17", yearInClass: 2, basis: "U17-2" });
    expect(classFor(2009, 2025)).toEqual({ category: "U19", yearInClass: 1, basis: "U19-1" });
    expect(classFor(2008, 2025)).toEqual({ category: "U19", yearInClass: 2, basis: "U19-2" });
    expect(classFor(2007, 2025)).toEqual({ category: "U23", yearInClass: 1, basis: "U23-1" });
    expect(classFor(2004, 2025)).toEqual({ category: "U23", yearInClass: 4, basis: "U23-4" });
  });

  it("moves up a class when the season turns in October, not on the birthday", () => {
    // Born 2010: turns 16 in 2026 and 17 in 2027.
    const september = classFor(2010, seasonStartYear("2026-09-30"));
    const october = classFor(2010, seasonStartYear("2026-10-01"));
    expect(september.basis).toBe("U17-2");
    expect(october.basis).toBe("U19-1");
    // The same all through a season, whatever the birthday.
    expect(classFor(2010, seasonStartYear("2026-03-01")).basis).toBe("U17-2");
  });

  it("is youth below U17 and senior above U23, with no DCU hours", () => {
    expect(classFor(2012, 2025)).toEqual({ category: "youth", yearInClass: null, basis: null });
    expect(classFor(2003, 2025)).toEqual({ category: "senior", yearInClass: null, basis: null });
  });

  it("lets a coach's override win", () => {
    expect(classFor(2010, 2025, "U19-1")).toEqual({
      category: "U19",
      yearInClass: 1,
      basis: "U19-1",
    });
    expect(classFor(2010, 2025, null).basis).toBe("U17-2");
  });

  it("reads a basis", () => {
    expect(basisParts("U23-3")).toEqual({ category: "U23", yearInClass: 3 });
    expect(isClassBasis("U19-2")).toBe(true);
    expect(isClassBasis("U19-3")).toBe(false);
    expect(isClassBasis(17)).toBe(false);
  });
});
