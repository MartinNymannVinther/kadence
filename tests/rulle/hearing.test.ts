import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildCourse,
  courseAt,
  crowdHeard,
  HEARING,
  mixOf,
  placeAt,
  raceDayOf,
  readLand,
  readRouteGpx,
  Towns,
  type Course,
  type Land,
} from "@/modules/rulle";

function route(name: string): { course: Course; land: Land } {
  const course = buildCourse(readRouteGpx(readFileSync(`public/rulle/routes/${name}.gpx`, "utf8")));
  const land = readLand(
    JSON.parse(readFileSync(`public/rulle/routes/${name}.land.json`, "utf8")),
    course,
  )!;
  return { course, land };
}

describe("the towns along a route", () => {
  it("counts the buildings within a radius, as a plain count over all of them does", () => {
    const { land } = route("vejle-munkebjerg");
    const towns = new Towns(land.buildings);
    for (const [x, y] of [
      [0, 0],
      [800, -300],
      [-2000, 1500],
    ] as const) {
      const plain = land.buildings.filter((b) => Math.hypot(b.x - x, b.y - y) <= 150).length;
      expect(towns.count(x, y, 150)).toBe(plain);
    }
  });

  it("hears Vejle as a town at the start, and the fjord road to Munkebjerg as country", () => {
    const { course, land } = route("vejle-munkebjerg");
    const towns = new Towns(land.buildings);
    const at = (d: number) => {
      const p = courseAt(course, d);
      return placeAt(towns, p.x, p.y, false);
    };
    expect(at(150)).toBe("town");
    const along = Array.from({ length: Math.floor(course.length / 100) }, (_, k) => at(k * 100));
    expect(along.filter((p) => p === "country").length).toBeGreaterThan(along.length / 3);
  });

  it("hears a city's course as the city's throughout, and a route without land as country", () => {
    expect(placeAt(null, 0, 0, true)).toBe("city");
    expect(placeAt(null, 0, 0, false)).toBe("country");
    expect(HEARING.townBuildings).toBeGreaterThan(1);
  });
});

describe("the crowd heard on race day", () => {
  const { course, land } = route("future-racing-2026-kobenhavn");
  const day = raceDayOf(course, land.setts ?? []);

  it("is loudest at the finish, and somewhere between 0 and 1 everywhere", () => {
    const finish = crowdHeard(day, course, 0);
    expect(finish).toBeGreaterThan(0.75);
    for (let d = 0; d < course.length; d += 50) {
      const c = crowdHeard(day, course, d);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
      expect(c).toBeLessThanOrEqual(finish + 1e-9);
    }
  });

  it("is quieter away from the finish", () => {
    const away = Array.from({ length: 40 }, (_, k) => crowdHeard(day, course, 2000 + k * 100));
    expect(Math.min(...away)).toBeLessThan(0.3);
  });
});

describe("the sound under the ride", () => {
  it("is quiet on the road standing still, with only a breath of wind", () => {
    const mix = mixOf({ speed: 0, place: "country", crowd: 0 });
    expect(mix.road.gain).toBe(0);
    expect(mix.wind.gain).toBeGreaterThan(0);
    expect(mix.wind.gain).toBeLessThan(0.01);
  });

  it("grows louder and brighter with speed, and never past its ceiling", () => {
    const slow = mixOf({ speed: 5, place: "country", crowd: 0 });
    const fast = mixOf({ speed: 12, place: "country", crowd: 0 });
    const flat = mixOf({ speed: 200, place: "country", crowd: 0 });
    expect(fast.road.gain).toBeGreaterThan(slow.road.gain);
    expect(fast.road.cutoff).toBeGreaterThan(slow.road.cutoff);
    expect(fast.wind.gain).toBeGreaterThan(slow.wind.gain);
    expect(flat.road.gain).toBeLessThanOrEqual(0.09);
    expect(flat.wind.gain).toBeLessThanOrEqual(0.14);
  });

  it("has birds in the country, fewer in a town, none in a city or at speed", () => {
    expect(mixOf({ speed: 8, place: "country", crowd: 0 }).birds).toBe(7);
    expect(mixOf({ speed: 8, place: "town", crowd: 0 }).birds).toBe(20);
    expect(mixOf({ speed: 8, place: "city", crowd: 0 }).birds).toBeNull();
    expect(mixOf({ speed: 16, place: "country", crowd: 0 }).birds).toBeNull();
  });

  it("hums in a town and more in a city, and hears the crowd only where it stands", () => {
    expect(mixOf({ speed: 8, place: "country", crowd: 0 }).hum).toBe(0);
    const town = mixOf({ speed: 8, place: "town", crowd: 0 }).hum;
    expect(mixOf({ speed: 8, place: "city", crowd: 0 }).hum).toBeGreaterThan(town);
    expect(mixOf({ speed: 8, place: "city", crowd: 0 }).crowd).toBe(0);
    const finish = mixOf({ speed: 8, place: "city", crowd: 1 });
    expect(finish.crowd).toBeGreaterThan(0);
    expect(finish.cheers).toBe(true);
    expect(mixOf({ speed: 8, place: "city", crowd: 0.4 }).cheers).toBe(false);
  });
});
