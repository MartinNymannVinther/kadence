import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildCourse,
  crowdAt,
  inside,
  lapGap,
  RACE_DAY,
  raceDayOf,
  readLand,
  readRouteGpx,
  type Course,
  type RaceDay,
  type RoutePoint,
} from "@/modules/rulle";

function route(name: string): { course: Course; day: RaceDay } {
  const course = buildCourse(readRouteGpx(readFileSync(`public/rulle/routes/${name}.gpx`, "utf8")));
  const land = readLand(
    JSON.parse(readFileSync(`public/rulle/routes/${name}.land.json`, "utf8")),
    course,
  );
  return { course, day: raceDayOf(course, land?.setts ?? []) };
}

/** Of the metres from `from` to `to`, the share with somebody standing on a side. */
function peopled(course: Course, day: RaceDay, from: number, to: number, side: 1 | -1) {
  let with_ = 0;
  for (let d = from; d < to; d++) if (crowdAt(day, course, d, side).rows > 0) with_++;
  return with_ / (to - from);
}

describe("race day in Copenhagen", () => {
  const { course, day } = route("future-racing-2026-kobenhavn");
  const L = course.length;

  it("has the organiser's islands, bends, bumps and zones where the marks are", () => {
    expect(day.islands).toHaveLength(12);
    // The two sharp turns and the two tight bends are warned of; every sharp corner has a marshal.
    expect(day.bends.filter((b) => b.marked)).toHaveLength(4);
    expect(day.bends.length).toBeGreaterThanOrEqual(10);
    for (let i = 1; i < day.bends.length; i++)
      expect(day.bends[i]!.along - day.bends[i - 1]!.along).toBeGreaterThanOrEqual(
        RACE_DAY.bendApart,
      );
    // Grønningen, a sharp right: the outside is the left.
    const gronningen = day.bends.find((b) => b.marked && b.along > 800 && b.along < 950)!;
    expect(gronningen.outside).toBe(-1);
    expect(day.bumps).toHaveLength(2);
    expect(day.bumps[1]! - day.bumps[0]!).toBeCloseTo(RACE_DAY.bumpApart);
    expect(day.feed!.side).toBe(1);
    expect(day.litter!.side).toBe(-1);
    expect(day.parking!.side).toBe(-1);
    expect(day.podium).not.toBeNull();
  });

  it("is cobbled where the land's streets are: Adelgade, and a bit of Nørre Allé", () => {
    expect(day.cobbles).toHaveLength(2);
    const [adelgade, norreAlle] = day.cobbles;
    expect(adelgade!.from).toBeGreaterThan(1690);
    expect(adelgade!.to).toBeLessThan(1820);
    expect(adelgade!.to - adelgade!.from).toBeGreaterThan(60);
    expect(norreAlle!.from).toBeGreaterThan(8860);
    expect(norreAlle!.to).toBeLessThan(8940);
  });

  it("is lined deep down the finish straight and thinly elsewhere", () => {
    expect(crowdAt(day, course, L - 20, 1).rows).toBe(3);
    expect(crowdAt(day, course, 30, -1).rows).toBe(3);
    expect(crowdAt(day, course, L - 200, -1).rows).toBe(2);
    expect(inside(day.finish, L + 40, L)).toBe(true);
    expect(peopled(course, day, L - RACE_DAY.finishBefore, L, 1)).toBe(1);
    // Out on the lap, a few together here and there.
    const open = peopled(course, day, 5000, 5400, 1);
    expect(open).toBeGreaterThan(0.02);
    expect(open).toBeLessThan(0.35);
    // Nobody stands where the soigneurs do.
    expect(crowdAt(day, course, day.feed!.from + 30, day.feed!.side).rows).toBe(0);
  });
});

describe("race day in Montréal", () => {
  const { course, day } = route("montreal-2026-mont-royal");

  it("has no organiser's marks and no cobbles, but its corners have marshals", () => {
    expect(day.islands).toEqual([]);
    expect(day.cobbles).toEqual([]);
    expect(day.feed).toBeNull();
    expect(day.bends.length).toBeGreaterThanOrEqual(8);
    // The corner just after the line and the one before it at the lap's end are the same corner.
    const ends = day.bends.filter((b) => lapGap(b.along, 0, course.length) < 20);
    expect(ends.length).toBeLessThanOrEqual(1);
  });

  it("is lined on Camillien-Houde and Polytechnique", () => {
    const on = (from: number, to: number) =>
      day.climbs.some((c) => c.from <= from + 60 && c.to >= to - 60);
    expect(on(1240, 2160)).toBe(true);
    expect(on(6140, 6450)).toBe(true);
    expect(crowdAt(day, course, 1700, 1).rows).toBe(2);
    expect(crowdAt(day, course, 1700, -1).rows).toBe(2);
  });
});

describe("cobbles from the land", () => {
  // A straight road north, 1 km out and back, a cobbled street along part of it and one across it.
  const road: RoutePoint[] = Array.from({ length: 21 }, (_, i) => ({
    lat: 55.7 + (1 / 111.2) * (i / 20),
    lon: 9.5,
    ele: 12,
  }));
  const course = buildCourse({ name: "Lige", points: road });
  const y0 = course.y[0]!;

  it("are where the road runs down a cobbled street, not where one crosses it", () => {
    const along = [
      { x: 1, y: y0 + 300 },
      { x: 1.5, y: y0 + 420 },
    ];
    const across = [
      { x: -40, y: y0 + 700 },
      { x: 40, y: y0 + 700 },
    ];
    const day = raceDayOf(course, [along, across]);
    const L = course.length;
    // Down it on the way out, and up it on the way back.
    expect(day.cobbles).toHaveLength(2);
    expect(day.cobbles[0]!.from).toBeGreaterThan(280);
    expect(day.cobbles[0]!.to).toBeLessThan(440);
    expect(day.cobbles[1]!.from).toBeGreaterThan(L - 440);
    expect(day.cobbles[1]!.to).toBeLessThan(L - 280);
  });

  it("are none on a plain road, and no island or zone without marks", () => {
    const day = raceDayOf(course);
    expect(day.cobbles).toEqual([]);
    expect(day.islands).toEqual([]);
    expect(day.parking).toBeNull();
    expect(day.climbs).toEqual([]);
  });
});
