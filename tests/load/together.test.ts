import { describe, expect, it } from "vitest";
import { companionsOf, firstFix, riddenTogether, type RideOutline } from "@/modules/load/together";

/** The same ride, or two riders on their own: what lays curves over each other. */

const at = (h: number, m = 0) => new Date(Date.UTC(2026, 8, 26, h, m));
const ride = (id: string, riderId: string, extra: Partial<RideOutline> = {}): RideOutline => ({
  id,
  riderId,
  onDate: "2026-09-26",
  sport: "bike",
  startedAt: at(9),
  distanceM: 70_000,
  start: { lat: 55.72, lon: 9.45 },
  ...extra,
});

describe("ridden together", () => {
  it("is the same day, same start, same distance, same place, another rider", () => {
    expect(riddenTogether(ride("a", "r1"), ride("b", "r2"))).toBe(true);
    expect(riddenTogether(ride("a", "r1"), ride("b", "r1"))).toBe(false);
    expect(riddenTogether(ride("a", "r1"), ride("a", "r1"))).toBe(false);
  });

  it("is not two rides an hour apart, of different length, or from different places", () => {
    expect(riddenTogether(ride("a", "r1"), ride("b", "r2", { startedAt: at(10, 10) }))).toBe(false);
    expect(riddenTogether(ride("a", "r1"), ride("b", "r2", { distanceM: 40_000 }))).toBe(false);
    expect(
      riddenTogether(ride("a", "r1"), ride("b", "r2", { start: { lat: 55.8, lon: 9.45 } })),
    ).toBe(false);
    expect(riddenTogether(ride("a", "r1"), ride("b", "r2", { onDate: "2026-09-25" }))).toBe(false);
  });

  it("does without GPS or distance when a ride has none", () => {
    expect(riddenTogether(ride("a", "r1", { start: null }), ride("b", "r2"))).toBe(true);
    expect(riddenTogether(ride("a", "r1", { distanceM: null }), ride("b", "r2"))).toBe(true);
  });

  it("picks the companions out of a day's rides", () => {
    const day = [
      ride("a", "r1"),
      ride("b", "r2"),
      ride("c", "r3", { startedAt: at(16) }),
      ride("d", "r4", { sport: "other" }),
    ];
    expect(companionsOf(day[0]!, day).map((r) => r.id)).toEqual(["b"]);
  });

  it("reads a ride's first fix from its streams", () => {
    expect(firstFix({ lat: [null, 55.7], lon: [null, 9.4] })).toEqual({ lat: 55.7, lon: 9.4 });
    expect(firstFix({ lat: [null], lon: [null] })).toBeNull();
    expect(firstFix(null)).toBeNull();
  });
});
