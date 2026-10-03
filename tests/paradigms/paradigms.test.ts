import { describe, expect, it } from "vitest";
import { LONGEST_RIDE, monthHours, weeklyCorridor } from "@/modules/dcu";
import { DCU_2025, isGuidanceId, paradigmFor } from "@/modules/paradigms";

/**
 * The paradigm shape (ADR 0049): DCU 2025 answers with DCU's own numbers,
 * unchanged, and "none" is no paradigm at all.
 */
describe("paradigms", () => {
  it("DCU 2025 answers with DCU's numbers", () => {
    expect(DCU_2025.monthHours("U19-1", 1)).toBe(monthHours("U19-1", 1));
    expect(DCU_2025.weeklyCorridor("U17-2", "2026-11-02")).toEqual(
      weeklyCorridor("U17-2", "2026-11-02"),
    );
    expect(DCU_2025.longestRide("U17")).toEqual({
      hours: LONGEST_RIDE.U17!.hours,
      km: LONGEST_RIDE.U17!.km,
    });
    expect(DCU_2025.longestRide("U23")).toBeNull();
  });

  it("the team's choice picks the paradigm, or none", () => {
    expect(paradigmFor("dcu-2025")).toBe(DCU_2025);
    expect(paradigmFor("none")).toBeNull();
  });

  it("knows its ids", () => {
    expect(isGuidanceId("dcu-2025")).toBe(true);
    expect(isGuidanceId("none")).toBe(true);
    expect(isGuidanceId("bdr-2009")).toBe(false);
  });
});

describe("the week's four numbers without a paradigm", () => {
  it("leaves the reference number out and says so", async () => {
    const { volumeOf } = await import("@/modules/season/volume");
    const input = {
      range: { from: "2026-11-02", to: "2026-11-08" },
      frameOf: () => ({ basis: "U19-1" as const, goal: null }),
      sessions: [],
      activities: [],
      today: "2026-11-04",
    };
    const guided = volumeOf(input);
    expect(guided.dcu).not.toBeNull();
    expect(guided.guided).toBe(true);
    const own = volumeOf({ ...input, paradigm: null });
    expect(own.dcu).toBeNull();
    expect(own.guided).toBe(false);
  });
});
