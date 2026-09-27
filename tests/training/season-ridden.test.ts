import { describe, expect, it } from "vitest";
import { monthlyBikeHours, seasonRange } from "@/modules/season/months";

/**
 * The season page's third column: what was ridden, month by month, on the
 * bike only (DCU counts nothing else), inside the season that runs from
 * October to September.
 */
describe("the ridden season", () => {
  it("runs from 1 October to 30 September", () => {
    expect(seasonRange(2025)).toEqual({ from: "2025-10-01", to: "2026-09-30" });
  });

  it("sums bike hours by month, October first, and leaves out the rest", () => {
    const months = monthlyBikeHours(
      [
        { onDate: "2025-11-03", sport: "bike", seconds: 3600 },
        { onDate: "2025-11-20", sport: "bike", seconds: 5400 },
        { onDate: "2025-11-21", sport: "strength", seconds: 3600 },
        { onDate: "2026-03-01", sport: "bike", seconds: 1800 },
        { onDate: "2026-10-01", sport: "bike", seconds: 3600 },
        { onDate: "2025-09-30", sport: "bike", seconds: 3600 },
      ],
      2025,
    );
    expect(months.map((m) => m.month)).toEqual([10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(months.find((m) => m.month === 11)!.hours).toBe(2.5);
    expect(months.find((m) => m.month === 3)!.hours).toBe(0.5);
    expect(months.find((m) => m.month === 10)!.hours).toBe(0);
    expect(months.reduce((sum, m) => sum + m.hours, 0)).toBe(3);
  });
});
