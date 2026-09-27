import { describe, expect, it } from "vitest";
import {
  COUNTS_TOWARD_DCU_HOURS,
  LONGEST_RIDE,
  U19_SEASON_MONTHLY_HOURS,
  exceedsLongestRide,
  monthHours,
} from "@/modules/dcu";

describe("the longest ride", () => {
  it("is 4 h or 120 km for U17, 5 h or 150 km for U19, and none for U23", () => {
    expect(LONGEST_RIDE.U17).toMatchObject({ hours: 4, km: 120 });
    expect(LONGEST_RIDE.U19).toMatchObject({ hours: 5, km: 150 });
    expect(LONGEST_RIDE.U23).toBeNull();
  });

  it("is exceeded by time or by distance, whichever comes first", () => {
    expect(exceedsLongestRide("U17", { hours: 4, km: 120 })).toBe(false);
    expect(exceedsLongestRide("U17", { hours: 4.25, km: 110 })).toBe(true);
    expect(exceedsLongestRide("U17", { hours: 3.5, km: 125 })).toBe(true);
    expect(exceedsLongestRide("U19", { hours: 4.5 })).toBe(false);
    expect(exceedsLongestRide("U23", { hours: 7, km: 220 })).toBe(false);
  });
});

describe("what counts toward DCU's hours", () => {
  it("is time on the bike alone", () => {
    expect(COUNTS_TOWARD_DCU_HOURS).toEqual({ bike: true, strength: false, other: false });
  });
});

describe("the 2016 U19 in-season band", () => {
  it("is 45-60 h a month, and the 2025 hours leave it in two months", () => {
    const { low, high } = U19_SEASON_MONTHLY_HOURS;
    expect([low, high]).toEqual([45, 60]);
    const outside = (["U19-1", "U19-2"] as const).flatMap((basis) =>
      [4, 5, 6, 7, 8, 9]
        .filter((m) => monthHours(basis, m) < low || monthHours(basis, m) > high)
        .map((m) => `${basis} ${m}: ${monthHours(basis, m)}`),
    );
    expect(outside).toEqual(["U19-1 9: 42", "U19-2 7: 66"]);
  });
});
