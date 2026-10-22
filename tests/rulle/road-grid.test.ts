import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RoadGrid } from "@/components/rulle/scene/road-grid";
import { buildCourse, readRouteGpx, type Course } from "@/modules/rulle";

const course = buildCourse(
  readRouteGpx(readFileSync("public/rulle/routes/vejle-munkebjerg.gpx", "utf8")),
);
const grid = new RoadGrid(course);

/** The distance to the road's line, the long way: every stretch of it. */
function byHand(c: Course, x: number, z: number): number {
  let best = Infinity;
  const n = c.x.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = c.x[i]!;
    const az = -c.y[i]!;
    const ux = c.x[j]! - ax;
    const uz = -c.y[j]! - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * ux + (z - az) * uz) / (ux * ux + uz * uz || 1)));
    best = Math.min(best, Math.hypot(ax + ux * t - x, az + uz * t - z));
  }
  return best;
}

describe("the nearest point of the road (docs/adr/0108)", () => {
  it("is on its line between the samples, not at the nearest sample ten metres off", () => {
    for (const i of [10, 400, 1234, course.x.length - 2]) {
      const j = i + 1;
      const x = (course.x[i]! + course.x[j]!) / 2;
      const z = -(course.y[i]! + course.y[j]!) / 2;
      const found = grid.nearest(x, z, 50);
      expect(found.d).toBeLessThan(0.01);
      expect([i, j]).toContain(found.index);
      expect(found.ele).toBeCloseTo((course.ele[i]! + course.ele[j]!) / 2, 6);
    }
  });

  it("is as near as the road's line is, anywhere within reach", () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let k = 0; k < 300; k++) {
      const i = Math.floor(random() * course.x.length);
      const x = course.x[i]! + (random() - 0.5) * 120;
      const z = -course.y[i]! + (random() - 0.5) * 120;
      expect(grid.nearest(x, z, 300).d).toBeCloseTo(byHand(course, x, z), 6);
    }
  });
});
