import { describe, expect, it } from "vitest";
import { addDaysIso } from "@/core/dates";
import {
  CLASS_BASES,
  DCU_TOTALS_2025,
  monthHours,
  seasonHours,
  weeklyCorridor,
  type ClassBasis,
} from "@/modules/dcu";

/**
 * The document's own figures, typed in a second time from the page
 * (Landevej_traeningsanbefalinger_2025.pdf p. 1): the printed sums, and
 * the printed hours per day, November to September.
 */
const PRINTED_TOTALS: Record<ClassBasis, { novMar: number; novSep: number }> = {
  "U17-1": { novMar: 193, novSep: 429 },
  "U17-2": { novMar: 223, novSep: 490 },
  "U19-1": { novMar: 254, novSep: 554 },
  "U19-2": { novMar: 282, novSep: 622 },
  "U23-1": { novMar: 312, novSep: 694 },
  "U23-2": { novMar: 344, novSep: 752 },
  "U23-3": { novMar: 375, novSep: 819 },
  "U23-4": { novMar: 406, novSep: 870 },
};

const PRINTED_PER_DAY: Record<ClassBasis, number[]> = {
  "U17-1": [0.7, 1.1, 1.4, 1.6, 1.6, 1.4, 1.4, 1.3, 1.5, 1.2, 1.0],
  "U17-2": [0.9, 1.3, 1.6, 1.8, 1.8, 1.5, 1.5, 1.4, 1.7, 1.4, 1.2],
  "U19-1": [1.1, 1.5, 1.8, 2.0, 2.0, 1.7, 1.7, 1.5, 1.8, 1.6, 1.4],
  "U19-2": [1.3, 1.7, 2.0, 2.1, 2.2, 2.0, 1.9, 1.7, 2.1, 1.8, 1.6],
  "U23-1": [1.5, 2.1, 2.3, 2.3, 2.3, 2.2, 2.2, 1.8, 2.3, 2.2, 1.8],
  "U23-2": [1.8, 2.3, 2.5, 2.5, 2.4, 2.3, 2.3, 2.0, 2.5, 2.3, 2.0],
  "U23-3": [2.0, 2.5, 2.7, 2.7, 2.6, 2.5, 2.5, 2.1, 2.8, 2.5, 2.2],
  "U23-4": [2.3, 2.7, 2.9, 2.9, 2.7, 2.6, 2.6, 2.2, 3.0, 2.6, 2.3],
};

const NOV_TO_SEP = [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const NOV_TO_MAR = [11, 12, 1, 2, 3];
// The 2025 table's winter: November 2024 to September 2025, February of 28 days.
const DAYS = [30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30];

describe("DCU's 2025 hours", () => {
  it.each(CLASS_BASES)("add up to the document's sums for %s", (basis) => {
    const winter = NOV_TO_MAR.reduce((sum, m) => sum + monthHours(basis, m), 0);
    expect(winter).toBe(PRINTED_TOTALS[basis].novMar);
    expect(seasonHours(basis)).toBe(PRINTED_TOTALS[basis].novSep);
    expect(DCU_TOTALS_2025[basis]).toEqual(PRINTED_TOTALS[basis]);
  });

  it("names the totals the brief and CLAUDE.md quote", () => {
    expect(CLASS_BASES.map(seasonHours)).toEqual([429, 490, 554, 622, 694, 752, 819, 870]);
  });

  it.each(CLASS_BASES)("round to the document's hours per day for %s", (basis) => {
    NOV_TO_SEP.forEach((month, i) => {
      const perDay = Math.round((monthHours(basis, month) / DAYS[i]!) * 10) / 10;
      expect(perDay).toBe(PRINTED_PER_DAY[basis][i]);
    });
  });

  it("plans October, pause + frit, as no hours", () => {
    for (const basis of CLASS_BASES) expect(monthHours(basis, 10)).toBe(0);
  });

  it("reads single months", () => {
    expect(monthHours("U17-1", 11)).toBe(21);
    expect(monthHours("U19-2", 3)).toBe(68);
    expect(monthHours("U23-4", 7)).toBe(92);
    expect(monthHours("U23-3", 9)).toBe(66);
  });

  it("refuses a month that does not exist", () => {
    expect(() => monthHours("U17-1", 0)).toThrow(RangeError);
    expect(() => monthHours("U17-1", 13)).toThrow(RangeError);
  });
});

describe("the weekly corridor", () => {
  it("spreads December's hours over its 31 days", () => {
    const week = weeklyCorridor("U17-1", "2025-12-08");
    expect(week.target).toBeCloseTo((34 / 31) * 7, 10);
    expect(week.low).toBeCloseTo(week.target * 0.8, 10);
    expect(week.high).toBeCloseTo(week.target * 1.2, 10);
    expect(week.breakDays).toBe(0);
  });

  it("takes the week of any day in it", () => {
    expect(weeklyCorridor("U17-1", "2025-12-11")).toEqual(weeklyCorridor("U17-1", "2025-12-08"));
  });

  it("weighs a week across February and March by its days in each", () => {
    // Monday 23 February 2026: six days of February (28 days), one of March.
    expect(weeklyCorridor("U19-1", "2026-02-23").target).toBeCloseTo((56 / 28) * 6 + 62 / 31, 10);
    expect(weeklyCorridor("U19-1", "2026-02-23").target).toBeCloseTo(14, 10);
    expect(weeklyCorridor("U17-1", "2026-02-23").target).toBeCloseTo((45 / 28) * 6 + 50 / 31, 10);
  });

  it("gives February's hours to 29 days in a leap year", () => {
    // Monday 28 February 2028: two days of February, five of March.
    expect(weeklyCorridor("U19-1", "2028-02-28").target).toBeCloseTo(
      (56 / 29) * 2 + (62 / 31) * 5,
      10,
    );
  });

  it("counts October's days as the break", () => {
    // Monday 28 September 2026: three days of September, four of October.
    const week = weeklyCorridor("U17-1", "2026-09-28");
    expect(week.breakDays).toBe(4);
    expect(week.target).toBeCloseTo((30 / 30) * 3, 10);
  });

  it("adds up over a season to the season's hours", () => {
    // From the first Monday in October 2025 to the week that ends in October 2026.
    let total = 0;
    for (let monday = "2025-10-06"; monday <= "2026-09-28"; monday = addDaysIso(monday, 7))
      total += weeklyCorridor("U23-2", monday).target;
    expect(total).toBeCloseTo(seasonHours("U23-2"), 8);
  });
});
