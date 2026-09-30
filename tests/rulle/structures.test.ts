import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildCourse,
  readLand,
  readRouteGpx,
  structuresOn,
  WIDE,
  type Course,
  type RoutePoint,
  type Structures,
} from "@/modules/rulle";

function route(name: string): { course: Course; found: Structures } {
  const course = buildCourse(readRouteGpx(readFileSync(`public/rulle/routes/${name}.gpx`, "utf8")));
  const land = readLand(
    JSON.parse(readFileSync(`public/rulle/routes/${name}.land.json`, "utf8")),
    course,
  )!;
  return { course, found: structuresOn(course, land.structures) };
}

const near = <T extends { along: number }>(list: T[], at: number, within = 60) =>
  list.find((s) => Math.abs(s.along - at) <= within);
const deckAt = (found: Structures, at: number) =>
  found.decks.find((d) => d.from - 30 <= at && at <= d.to + 30);

describe("the bridges and tunnels on the routes that come with Kadence", () => {
  it("B&U DM: under the wildlife crossing at Vejledalen and the footbridge by the line, over two tracks", () => {
    const { found } = route("bu-dm-2026-vejle");
    const green = near(found.overpasses, 9255);
    expect(green?.kind).toBe("green");
    // The road's own tunnel under it gives its width along the road.
    expect(green!.wide).toBeGreaterThan(20);
    expect(near(found.overpasses, 9881)?.kind).toBe("path");
    expect(near(found.underpasses, 8756)?.kind).toBe("path");
    expect(near(found.underpasses, 8974)?.kind).toBe("path");
    expect(found.decks).toEqual([]);
  });

  it("Vejle–Munkebjerg: under the station's tracks and Vejlefjordbroen, over Vejle Å on Dæmningen", () => {
    const { found } = route("vejle-munkebjerg");
    const station = near(found.overpasses, 150);
    expect(station?.kind).toBe("rail");
    // Seven tracks side by side, one overpass as wide as all of them.
    expect(station!.wide).toBeGreaterThan(WIDE.rail * 2);
    const fjord = near(found.overpasses, 3050);
    expect(fjord?.kind).toBe("motorway");
    // The whole bridge across the fjord, not only where it meets the road.
    const [a, b] = [fjord!.points[0]!, fjord!.points.at(-1)!];
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThan(500);
    expect(near(found.overpasses, 6164)?.kind).toBe("rail");
    expect(deckAt(found, 863)).toBeDefined();
    expect(deckAt(found, 17775)).toBeDefined();
  });

  it("Ry–Himmelbjerget: over the Gudenå at Ry and at Emborg", () => {
    const { found } = route("ry-himmelbjerget");
    const ry = deckAt(found, 870);
    expect(ry).toBeDefined();
    expect(ry!.to - ry!.from).toBeGreaterThan(30);
    expect(deckAt(found, 15170)).toBeDefined();
  });

  it("in the cities: only small tunnels under the road, nothing over it", () => {
    for (const name of ["future-racing-2026-kobenhavn", "montreal-2026-mont-royal"]) {
      const { found } = route(name);
      expect(found.decks, name).toEqual([]);
      expect(found.overpasses, name).toEqual([]);
    }
    const { found } = route("future-racing-2026-kobenhavn");
    expect(found.underpasses.length).toBeGreaterThan(2);
  });
});

describe("a made-up road and its structures", () => {
  // A straight road north, 1 km out and back.
  const road: RoutePoint[] = Array.from({ length: 21 }, (_, i) => ({
    lat: 55.7 + (1 / 111.2) * (i / 20),
    lon: 9.5,
    ele: 12,
  }));
  const course = buildCourse({ name: "Lige", points: road });
  const y0 = course.y[0]!;
  const line = (x0: number, y0_: number, x1: number, y1: number) => [
    { x: x0, y: y0_ },
    { x: x1, y: y1 },
  ];

  it("finds a deck along it, a railway over it and a path under it, there and back", () => {
    const found = structuresOn(course, [
      { kind: "road", bridge: true, tunnel: false, points: line(0.5, y0 + 200, 0.5, y0 + 260) },
      { kind: "rail", bridge: true, tunnel: false, points: line(-50, y0 + 500, 50, y0 + 500) },
      { kind: "path", bridge: false, tunnel: true, points: line(-20, y0 + 800, 20, y0 + 800) },
      // A culvert is nobody's to see.
      { kind: "water", bridge: false, tunnel: true, points: line(-10, y0 + 650, 10, y0 + 650) },
    ]);
    const L = course.length;
    // Metres along the lap where the road first comes to a place north of the start.
    const at = (y: number) => course.y.findIndex((v) => v >= y) * course.step;
    expect(found.decks).toHaveLength(2);
    expect(found.decks[0]!.from).toBeLessThan(at(y0 + 200) + 1);
    expect(found.decks[0]!.to).toBeGreaterThan(at(y0 + 260) - 11);
    expect(found.overpasses).toHaveLength(2);
    expect(Math.abs(found.overpasses[0]!.along - at(y0 + 500))).toBeLessThan(11);
    expect(Math.abs(found.overpasses[1]!.along - (L - at(y0 + 500)))).toBeLessThan(21);
    expect(found.overpasses[0]!.angle).toBeCloseTo(Math.PI / 2, 1);
    expect(found.underpasses).toHaveLength(2);
    expect(found.underpasses.every((u) => u.kind === "path")).toBe(true);
  });

  it("finds nothing where there is nothing", () => {
    expect(structuresOn(course)).toEqual({ decks: [], overpasses: [], underpasses: [] });
  });
});
