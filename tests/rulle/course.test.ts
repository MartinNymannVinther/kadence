import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildCourse,
  bundledRoute,
  COURSE,
  courseAt,
  DEFAULT_ROUTE,
  readRouteGpx,
  RouteError,
  ROUTES,
  type RoutePoint,
} from "@/modules/rulle";

const vejle = buildCourse(
  readRouteGpx(readFileSync("public/rulle/routes/vejle-munkebjerg.gpx", "utf8")),
);

/** A straight road north from Vejle, `km` long, climbing `rise` metres evenly. */
function straight(km: number, rise: number, points = 50): RoutePoint[] {
  return Array.from({ length: points + 1 }, (_, i) => ({
    lat: 55.7 + (km / 111.2) * (i / points),
    lon: 9.5,
    ele: 10 + rise * (i / points),
  }));
}

describe("Vejle as a course", () => {
  it("is the route's 18 km, closed into a loop", () => {
    expect(vejle.length).toBeGreaterThan(17_900);
    expect(vejle.length).toBeLessThan(18_100);
    expect(vejle.outAndBack).toBe(false);
    const start = courseAt(vejle, 0);
    const lap = courseAt(vejle, vejle.length);
    expect(lap.lap).toBe(1);
    expect(Math.hypot(lap.x - start.x, lap.y - start.y)).toBeLessThan(0.01);
    expect(lap.ele).toBeCloseTo(start.ele, 6);
  });

  it("has Munkebjerg's hill and about 230 metres of climbing", () => {
    expect(vejle.ascent).toBeGreaterThan(180);
    expect(vejle.ascent).toBeLessThan(280);
    expect(vejle.maxEle).toBeGreaterThan(85);
    expect(vejle.minEle).toBeGreaterThan(-5);
    // Munkebjerg: from the fjord at 6 km to the top around 7.3 km.
    const foot = courseAt(vejle, 6_000).ele;
    const top = courseAt(vejle, 7_300).ele;
    expect(top - foot).toBeGreaterThan(60);
  });

  it("never tilts steeper than a road does, and every slope is the step between its heights", () => {
    const n = vejle.grade.length;
    for (let i = 0; i < n; i++) {
      expect(Math.abs(vejle.grade[i]!)).toBeLessThanOrEqual(COURSE.maxGrade + 1e-3);
      const rise = vejle.ele[(i + 1) % n]! - vejle.ele[i]!;
      expect(rise).toBeCloseTo(vejle.grade[i]! * vejle.step, 6);
    }
  });

  it("is sampled evenly, about every ten metres", () => {
    expect(vejle.step).toBeGreaterThan(9.5);
    expect(vejle.step).toBeLessThan(10.5);
    expect(vejle.x).toHaveLength(vejle.grade.length);
  });
});

describe("where the rider is", () => {
  it("goes round and round, and backwards past the start", () => {
    const third = courseAt(vejle, vejle.length * 2 + 500);
    expect(third.lap).toBe(2);
    expect(third.along).toBeCloseTo(500, 6);
    const before = courseAt(vejle, -10);
    expect(before.lap).toBe(-1);
    expect(before.along).toBeCloseTo(vejle.length - 10, 6);
  });

  it("faces along the road", () => {
    const course = buildCourse({ name: "", points: straight(5, 0) });
    // Due north from the start: 90 degrees counter-clockwise from east.
    expect(courseAt(course, 1_000).heading).toBeCloseTo(Math.PI / 2, 2);
  });
});

describe("a route that ends somewhere else", () => {
  const course = buildCourse({ name: "Op ad bakken", points: straight(2, 60) });

  it("is ridden out and back the same way", () => {
    expect(course.outAndBack).toBe(true);
    expect(course.length).toBeGreaterThan(3_950);
    expect(course.length).toBeLessThan(4_050);
  });

  it("climbs on the way out and descends on the way back", () => {
    expect(courseAt(course, 1_000).grade).toBeGreaterThan(0.02);
    expect(courseAt(course, 3_000).grade).toBeLessThan(-0.02);
    expect(course.ascent).toBeGreaterThan(50);
    expect(course.ascent).toBeLessThan(62);
  });
});

describe("what is refused", () => {
  it("a route shorter than half a kilometre", () => {
    expect(() => buildCourse({ name: "", points: straight(0.1, 0) })).toThrow(RouteError);
  });

  it("points that never move", () => {
    const still = Array.from({ length: 5 }, () => ({ lat: 55, lon: 9, ele: 1 }));
    expect(() => buildCourse({ name: "", points: still })).toThrow(RouteError);
  });
});

describe("the routes that come with Kadence", () => {
  it("are what their files come to, a lap each", () => {
    for (const route of ROUTES) {
      const course = buildCourse(readRouteGpx(readFileSync(`public${route.file}`, "utf8")));
      expect(Math.round(course.length / 100) / 10).toBe(route.km);
      expect(Math.abs(course.ascent - route.climb)).toBeLessThan(3);
      expect(course.outAndBack).toBe(false);
    }
  });

  it("start with the B&U DM course, whose lap ends at its finish on Vejledalen", () => {
    expect(DEFAULT_ROUTE).toBe("bu-dm-2026");
    const dm = bundledRoute("bu-dm-2026");
    expect(dm.finish).toBe(true);
    const file = readRouteGpx(readFileSync(`public${dm.file}`, "utf8"));
    expect(file.name).toBe("B&U DM 2026: Linjeløbet i Vejle");
    // The race's start and finish: Vejledalen (toppen).
    expect(file.points[0]!.lat).toBeCloseTo(55.7222, 3);
    expect(file.points[0]!.lon).toBeCloseTo(9.4899, 3);
    expect(bundledRoute("nowhere").key).toBe("bu-dm-2026");
  });
});
