import { describe, expect, it } from "vitest";
import {
  CORRIDOR_BAND,
  LONGEST_RIDE,
  monthHours,
  strengthFrequency,
  weeklyCorridor,
} from "@/modules/dcu";
import {
  DCU_2025,
  DEFAULT_SENIOR_PROFILE,
  SENIOR_BASES,
  SENIOR_HOURS,
  isPlanBasis,
  isSeniorBasis,
  profileOf,
  referenceOf,
  seniorBasisOf,
  seniorMonthHours,
  seniorSeasonHours,
  seniorStrengthFrequency,
  seniorWeeklyCorridor,
} from "@/modules/paradigms";

/**
 * Kadence's own numbers for riders past U23 (docs/adr/0091,
 * docs/research/senior-motionister.md): two profiles whose months follow
 * DCU's season, a floor at WHO's 150 minutes a week and a ceiling well
 * under NCF's 700 hours, the week's corridor shaped as DCU's, and their
 * longest rides and strength rhythm. DCU's numbers for U17–U23 are
 * untouched.
 */

const NOV_TO_SEP = [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];

describe("the two profiles' hours", () => {
  it("add up to about 280 and 520 hours, about 5.4 and 10 a week", () => {
    expect(seniorSeasonHours("senior-motionist")).toBe(280);
    expect(seniorSeasonHours("senior-super-motionist")).toBe(520);
    expect(seniorSeasonHours("senior-motionist") / 52).toBeCloseTo(5.4, 1);
    expect(seniorSeasonHours("senior-super-motionist") / 52).toBeCloseTo(10, 0);
  });

  it("give every month from November to September some hours, and October none", () => {
    for (const basis of SENIOR_BASES) {
      expect(SENIOR_HOURS[basis]).toHaveLength(11);
      for (const month of NOV_TO_SEP) expect(seniorMonthHours(basis, month)).toBeGreaterThan(0);
      expect(seniorMonthHours(basis, 10)).toBe(0);
    }
  });

  it("are shaped as DCU's season: built through the winter, most in May to August, less in September", () => {
    for (const basis of SENIOR_BASES) {
      const h = (m: number) => seniorMonthHours(basis, m);
      for (let i = 1; i < 9; i++)
        expect(h(NOV_TO_SEP[i]!)).toBeGreaterThanOrEqual(h(NOV_TO_SEP[i - 1]!));
      const peak = Math.max(...NOV_TO_SEP.map(h));
      expect([5, 6, 7, 8].map(h)).toContain(peak);
      expect(h(9)).toBeLessThan(h(8));
    }
  });

  it("keep a motionist above WHO's 150 minutes a week even in November", () => {
    const novemberWeek = (seniorMonthHours("senior-motionist", 11) / 30) * 7;
    expect(novemberWeek * 60).toBeGreaterThan(150);
  });

  it("keep a supermotionist well under NCF's 700 hours for the best seniors", () => {
    expect(seniorSeasonHours("senior-super-motionist")).toBeLessThan(700 * 0.8);
  });

  it("reject a month that is not one", () => {
    expect(() => seniorMonthHours("senior-motionist", 13)).toThrow(RangeError);
  });
});

describe("the week's corridor for a senior", () => {
  it("is the target ± DCU's band, from the month's hours over its days", () => {
    const c = seniorWeeklyCorridor("senior-motionist", "2026-11-04");
    expect(c.target).toBeCloseTo((16 / 30) * 7, 9);
    expect(c.low).toBeCloseTo(c.target * (1 - CORRIDOR_BAND), 9);
    expect(c.high).toBeCloseTo(c.target * (1 + CORRIDOR_BAND), 9);
    expect(c.breakDays).toBe(0);
  });

  it("weighs a week across two months by its days, and counts October's free days", () => {
    // Monday 28 September 2026: three days of September, four of October.
    const c = seniorWeeklyCorridor("senior-super-motionist", "2026-09-28");
    expect(c.target).toBeCloseTo((48 / 30) * 3, 9);
    expect(c.breakDays).toBe(4);
  });
});

describe("the longest ride and strength", () => {
  it("are 3 h or 90 km for a motionist and 5 h or 150 km for a supermotionist", () => {
    expect(DCU_2025.longestRide("senior-motionist")).toEqual({ hours: 3, km: 90 });
    expect(DCU_2025.longestRide("senior-super-motionist")).toEqual({ hours: 5, km: 150 });
  });

  it("is two a week through the winter and one in the season", () => {
    const n = (basis: "senior-motionist" | "senior-super-motionist", date: string) =>
      seniorStrengthFrequency(basis, date).perWeekMin;
    expect([n("senior-motionist", "2026-11-02"), n("senior-motionist", "2027-02-15")]).toEqual([
      2, 2,
    ]);
    expect(n("senior-motionist", "2027-03-01")).toBe(1);
    expect(n("senior-super-motionist", "2027-03-31")).toBe(2);
    expect(n("senior-super-motionist", "2027-04-01")).toBe(1);
    expect(n("senior-motionist", "2026-10-12")).toBe(1);
    const f = seniorStrengthFrequency("senior-motionist", "2026-12-01");
    expect(f).toMatchObject({ perWeekMin: 2, perWeekMax: 2, minHoursBetween: 48 });
  });
});

describe("the paradigm answers for both kinds of basis", () => {
  it("gives a senior basis the profile's numbers", () => {
    expect(DCU_2025.monthHours("senior-super-motionist", 7)).toBe(62);
    expect(DCU_2025.weeklyCorridor("senior-motionist", "2026-11-02")).toEqual(
      seniorWeeklyCorridor("senior-motionist", "2026-11-02"),
    );
    expect(DCU_2025.strengthFrequency("senior-motionist", "2027-03-02").perWeekMin).toBe(1);
  });

  it("leaves DCU's numbers for a U19 rider exactly as they were", () => {
    expect(DCU_2025.monthHours("U19-1", 1)).toBe(56);
    expect(DCU_2025.monthHours("U19-1", 1)).toBe(monthHours("U19-1", 1));
    expect(DCU_2025.weeklyCorridor("U19-2", "2026-11-02")).toEqual(
      weeklyCorridor("U19-2", "2026-11-02"),
    );
    expect(DCU_2025.longestRide("U19")).toEqual({
      hours: LONGEST_RIDE.U19!.hours,
      km: LONGEST_RIDE.U19!.km,
    });
    for (const date of ["2026-11-02", "2027-03-15", "2027-03-16", "2027-06-01"])
      expect(DCU_2025.strengthFrequency("U19-1", date)).toEqual(strengthFrequency(date));
    expect(DCU_2025.strengthFrequency(null, "2026-11-02")).toEqual(strengthFrequency("2026-11-02"));
  });
});

describe("the names of a senior basis", () => {
  it("default to motionist and read back", () => {
    expect(DEFAULT_SENIOR_PROFILE).toBe("motionist");
    expect(seniorBasisOf(null)).toBe("senior-motionist");
    expect(seniorBasisOf("nonsense")).toBe("senior-motionist");
    expect(seniorBasisOf("super-motionist")).toBe("senior-super-motionist");
    expect(profileOf("senior-super-motionist")).toBe("super-motionist");
    expect(isSeniorBasis("senior-motionist")).toBe(true);
    expect(isSeniorBasis("U23-4")).toBe(false);
    expect(isPlanBasis("U23-4")).toBe(true);
    expect(isPlanBasis("senior-super-motionist")).toBe(true);
    expect(isPlanBasis("senior")).toBe(false);
  });

  it("say whose numbers stand beside a plan", () => {
    expect(referenceOf("U19-1")).toBe("dcu");
    expect(referenceOf(null)).toBe("dcu");
    expect(referenceOf("senior-motionist")).toBe("motionist");
    expect(referenceOf("senior-super-motionist")).toBe("supermotionist");
  });
});
