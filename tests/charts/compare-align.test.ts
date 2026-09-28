import { describe, expect, it } from "vitest";
import { alignRides, distanceAlong, nearestIndex } from "@/components/activities/compare-align";

/** Rides laid over each other line up by distance, or by time when one has no speed. */
describe("aligning rides", () => {
  const streams = (n: number, speed: number | null) => ({
    t: Array.from({ length: n }, (_, i) => i * 5),
    power: Array.from({ length: n }, () => 200),
    speed: speed === null ? undefined : Array.from({ length: n }, () => speed),
  });

  it("sums speed into metres along the ride", () => {
    expect(distanceAlong(streams(4, 10))).toEqual([50, 100, 150, 200]);
    expect(distanceAlong(streams(4, null))).toBeNull();
  });

  it("lines up by distance when every ride has speed, else by time, and speed reads km/h", () => {
    const byDistance = alignRides([streams(4, 10), streams(4, 8)]);
    expect(byDistance.axis).toBe("distance");
    expect(byDistance.rides[1]!.x).toEqual([40, 80, 120, 160]);
    expect(byDistance.rides[1]!.speed[0]).toBeCloseTo(28.8, 5);
    const byTime = alignRides([streams(4, 10), streams(4, null)]);
    expect(byTime.axis).toBe("time");
    expect(byTime.rides[0]!.x).toEqual([0, 5, 10, 15]);
  });

  it("finds the nearest sample on a rising axis", () => {
    expect(nearestIndex([0, 50, 100, 150], 60)).toBe(1);
    expect(nearestIndex([0, 50, 100, 150], 80)).toBe(2);
    expect(nearestIndex([0, 50, 100, 150], 999)).toBe(3);
  });
});
