import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildCourse,
  CITIES,
  readLand,
  readRouteGpx,
  ROUTES,
  sunToward,
  toPlane,
} from "@/modules/rulle";

describe("a city's face on its race day", () => {
  it("is there for every city a route runs through", () => {
    for (const route of ROUTES) {
      const city = "city" in route ? route.city : undefined;
      if (city) expect(CITIES[city], route.key).toBeDefined();
    }
  });

  it("has the sun where the day and the hour put it", () => {
    // A June morning in Copenhagen: east-south-east, well up.
    const cph = sunToward(CITIES.kobenhavn.sun);
    expect(cph.x).toBeGreaterThan(0.7);
    expect(cph.z).toBeGreaterThan(0);
    expect(cph.y).toBeCloseTo(Math.sin((39 * Math.PI) / 180), 5);
    // A September afternoon in Montréal: south-south-west.
    const mtl = sunToward(CITIES.montreal.sun);
    expect(mtl.x).toBeLessThan(0);
    expect(mtl.z).toBeGreaterThan(Math.abs(mtl.x));
    expect(Math.hypot(mtl.x, mtl.y, mtl.z)).toBeCloseTo(1, 10);
  });

  it("builds and lights each city its own way", () => {
    expect(CITIES.kobenhavn).toMatchObject({ trees: "summer", lamps: "wires", stairs: false });
    expect(CITIES.montreal).toMatchObject({ trees: "maples", lamps: "posts", stairs: true });
  });

  it("stands Mont-Royal's cross on Montréal's own land, near the course", () => {
    const name = "montreal-2026-mont-royal";
    const course = buildCourse(
      readRouteGpx(readFileSync(`public/rulle/routes/${name}.gpx`, "utf8")),
    );
    const land = readLand(
      JSON.parse(readFileSync(`public/rulle/routes/${name}.land.json`, "utf8")),
      course,
    )!;
    const [cross] = CITIES.montreal.landmarks;
    expect(cross!.height).toBe(31.4);
    const p = toPlane(course.origin, cross!.lat, cross!.lon);
    // On the summit: the land's height there is well above the course's lowest.
    expect(land.heightAt(p.x, p.y)).toBeGreaterThan(Math.min(...course.ele) + 100);
    let nearest = Infinity;
    for (let i = 0; i < course.x.length; i++)
      nearest = Math.min(nearest, Math.hypot(course.x[i]! - p.x, course.y[i]! - p.y));
    expect(nearest).toBeLessThan(400);
  });
});
