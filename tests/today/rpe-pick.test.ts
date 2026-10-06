import { describe, expect, it } from "vitest";
import { rideToRate } from "@/components/today/rpe-pick";

/**
 * Which ride Today asks "Hvor hårdt føltes turen?" about (docs/adr/0063):
 * the latest of the last three days, only while it has no answer, and
 * not again once the rider put it off.
 */

const TODAY = "2026-10-06";
const ride = (id: string, onDate: string, hour: number, rpe: number | null = null) => ({
  id,
  onDate,
  startedAt: new Date(`${onDate}T${String(hour).padStart(2, "0")}:00:00Z`),
  rpe,
});

describe("the ride to ask about", () => {
  it("is the latest ride, when it has no RPE", () => {
    const rides = [
      ride("a", "2026-10-04", 9),
      ride("b", "2026-10-05", 15),
      ride("c", "2026-10-05", 7),
    ];
    expect(rideToRate(rides, TODAY)?.id).toBe("b");
  });

  it("is nothing when the latest ride already has an answer", () => {
    const rides = [ride("a", "2026-10-05", 9), ride("b", "2026-10-06", 8, 6)];
    expect(rideToRate(rides, TODAY)).toBeNull();
  });

  it("looks three days back, today included, and no further", () => {
    expect(rideToRate([ride("a", "2026-10-04", 9)], TODAY)?.id).toBe("a");
    expect(rideToRate([ride("a", "2026-10-03", 9)], TODAY)).toBeNull();
    // A ride dated ahead of today (a clock gone wrong) is not today's question.
    expect(rideToRate([ride("a", "2026-10-07", 9)], TODAY)).toBeNull();
  });

  it("is nothing without rides", () => {
    expect(rideToRate([], TODAY)).toBeNull();
  });

  it("is not asked again once put off, and an earlier ride does not take its place", () => {
    const rides = [ride("a", "2026-10-05", 9), ride("b", "2026-10-06", 8)];
    expect(rideToRate(rides, TODAY, new Set(["b"]))).toBeNull();
    expect(rideToRate(rides, TODAY, new Set(["a"]))?.id).toBe("b");
  });
});
