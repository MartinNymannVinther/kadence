import { describe, expect, it } from "vitest";
import { projectRoute } from "@/components/activities/route-geometry";

describe("the route drawing", () => {
  it("fits the route inside the width without stretching it", () => {
    // 0.01° north and 0.01° east at 55.7°N: east is about 0.56 of north.
    const route = projectRoute([55.7, 55.71], [12.5, 12.51], 400, 400, 0)!;
    const [a, b] = route.points as [readonly [number, number], readonly [number, number]];
    const dx = b[0] - a[0];
    const dy = a[1] - b[1];
    expect(dy).toBeCloseTo(400, 0);
    expect(dx / dy).toBeCloseTo(Math.cos((55.705 * Math.PI) / 180), 2);
    expect(route.height).toBe(400);
  });

  it("puts north up and breaks the line where the GPS had no fix", () => {
    const route = projectRoute([55.7, null, 55.71], [12.5, null, 12.5], 300, 300)!;
    expect(route.points[1]).toBeNull();
    expect(route.points[2]![1]).toBeLessThan(route.points[0]![1]);
  });

  it("draws nothing from fewer than two fixes", () => {
    expect(projectRoute([55.7, null], [12.5, null], 300, 300)).toBeNull();
  });

  it("keeps a wide route short", () => {
    const route = projectRoute([55.7, 55.7001], [12.5, 12.6], 400, 400)!;
    expect(route.height).toBeLessThan(60);
  });
});
