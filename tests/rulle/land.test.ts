import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BANK,
  buildCourse,
  LAND_KINDS,
  MAPPED,
  readLand,
  readRouteGpx,
  ROUTES,
  type LandFile,
  type RoutePoint,
} from "@/modules/rulle";

/** A straight road north through Vejle's hills, 2 km at 12 m: x 0, y from about -1000 to 1000. */
const road: RoutePoint[] = Array.from({ length: 41 }, (_, i) => ({
  lat: 55.7 + (2 / 111.2) * (i / 40),
  lon: 9.5,
  ele: 12,
}));
const course = buildCourse({ name: "Lige", points: road });

const square = (x0: number, y0: number, x1: number, y1: number) => [
  x0,
  y0,
  x1,
  y0,
  x1,
  y1,
  x0,
  y1,
  x0,
  y0,
];
const kind = <K extends keyof typeof LAND_KINDS>(list: K, name: (typeof LAND_KINDS)[K][number]) =>
  (LAND_KINDS[list] as readonly string[]).indexOf(name);

/** Heights on a plane rising east, 20 m at the road, a metre every 100 m: exact under bilinear. */
function heights(cols = 21, rows = 31) {
  const dm = new Int16Array(cols * rows);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++)
      dm[j * cols + i] = Math.round((20 + (-1000 + i * 100) / 100) * 10);
  return {
    x0: -1000,
    y0: -1500,
    step: 100,
    cols,
    rows,
    dm: Buffer.from(dm.buffer).toString("base64"),
  };
}

function file(overrides: Partial<LandFile> = {}): LandFile {
  return {
    version: 1,
    origin: course.origin,
    fetched: "2026-09-30T08:00:00Z",
    heights: heights(),
    areas: [
      [kind("areas", "field"), square(100, -300, 600, 300)],
      [kind("areas", "forest"), square(400, -100, 800, 100)],
      // A lake with an island in it, 200 m west of the road.
      [kind("areas", "water"), square(-700, -400, -200, 400), square(-500, -50, -400, 50)],
      // A pond right beside the road, its shore higher than the road.
      [kind("areas", "water"), square(-60, -100, -15, 100)],
    ],
    lines: [[kind("lines", "hedge"), [100, 500, 600, 500]]],
    buildings: [
      [300, 800, 10, 8, 0.3, kind("buildings", "house"), 1],
      // A spire on a tower: 60 m to its tip from 40 m up, pyramidal, in copper.
      [
        320,
        820,
        8,
        8,
        0,
        kind("buildings", "part"),
        0,
        60,
        40,
        kind("roofs", "pyramidal"),
        0x6f9e87,
      ],
    ],
    turbines: [[900, 1400]],
    trees: [[-5, 120]],
    ...overrides,
  };
}

describe("the land round a route", () => {
  const land = readLand(file(), course)!;

  it("reads its heights between the model's points, and none beyond them", () => {
    expect(land).not.toBeNull();
    expect(land.heightAt(0, 0)).toBeCloseTo(20, 6);
    expect(land.heightAt(250, 37)).toBeCloseTo(22.5, 6);
    expect(land.heightAt(-1000, -1500)).toBeCloseTo(10, 6);
    expect(land.heightAt(1000, 1500)).toBeCloseTo(30, 6);
    expect(land.heightAt(1001, 0)).toBeNull();
    expect(land.heightAt(0, -1500.5)).toBeNull();
  });

  it("lays what covers it in order: a wood over a field, nothing in a lake's island", () => {
    expect(land.coverAt(200, 0)?.kind).toBe("field");
    expect(land.coverAt(500, 0)?.kind).toBe("forest");
    expect(land.coverAt(500, 250)?.kind).toBe("field");
    expect(land.coverAt(-300, 300)?.kind).toBe("water");
    expect(land.coverAt(-450, 0)).toBeNull();
    expect(land.coverAt(0, 1400)).toBeNull();
    // A field is one field: the same number all over it.
    expect(land.coverAt(150, -250)?.id).toBe(land.coverAt(550, 250)?.id);
  });

  it("puts a lake's water at its shore's lowest height", () => {
    // The shore runs from 13 m in the west to 18 m in the east.
    expect(land.waterAt(-300, 300)).toBeCloseTo(13, 6);
    expect(land.waterAt(-650, -350)).toBeCloseTo(13, 6);
    expect(land.waterAt(-450, 0)).toBeNull();
    expect(land.waterAt(200, 0)).toBeNull();
    expect(land.waters.map((w) => w.level)).toContainEqual(13);
  });

  it("never lets a lake lie above the road beside it", () => {
    // The pond's shore is 19.4 m, the road beside it 12 m.
    expect(land.waterAt(-30, 0)).toBeCloseTo(12 - BANK, 6);
    for (let i = 0; i < course.x.length; i++) {
      const level = land.waterAt(course.x[i]! - 20, course.y[i]!);
      if (level !== null) expect(level).toBeLessThanOrEqual(course.ele[i]! - BANK + 1e-9);
    }
  });

  it("keeps the lines, buildings and turbines", () => {
    expect(land.lines).toEqual([
      {
        kind: "hedge",
        points: [
          { x: 100, y: 500 },
          { x: 600, y: 500 },
        ],
      },
    ]);
    expect(land.buildings).toEqual([
      {
        ...{ x: 300, y: 800, w: 10, d: 8, angle: 0.3, kind: "house", levels: 1 },
        ...{ height: null, minHeight: 0, roof: "unsaid", roofColour: null },
      },
      {
        ...{ x: 320, y: 820, w: 8, d: 8, angle: 0, kind: "part", levels: 0 },
        ...{ height: 60, minHeight: 40, roof: "pyramidal", roofColour: 0x6f9e87 },
      },
    ]);
    expect(land.turbines).toEqual([{ x: 900, y: 1400 }]);
    expect(land.trees).toEqual([{ x: -5, y: 120 }]);
    // A file from before the street trees is read all the same.
    const older = file();
    delete older.trees;
    expect(readLand(older, course)!.trees).toEqual([]);
    expect(land.areas.map((a) => a.kind)).toEqual(["field", "forest", "water", "water"]);
  });

  it("says how far from the road its buildings reach: 700 m when the file does not say", () => {
    expect(land.reach).toBe(MAPPED);
    expect(MAPPED).toBe(700);
    expect(readLand(file({ reach: 2600 }), course)!.reach).toBe(2600);
    expect(readLand(file({ reach: -1 }), course)).toBeNull();
  });

  it("is no land at all when made for another course, or not what it says it is", () => {
    const moved = { ...course.origin, lat: course.origin.lat + 0.001 };
    expect(readLand(file({ origin: moved }), course)).toBeNull();
    expect(readLand({ ...file(), version: 2 }, course)).toBeNull();
    expect(readLand({ ...file(), heights: { ...heights(), dm: "AAAA" } }, course)).toBeNull();
    expect(readLand({ ...file(), buildings: [[1, 2, 3]] }, course)).toBeNull();
    expect(readLand("<gpx/>", course)).toBeNull();
    expect(readLand(null, course)).toBeNull();
  });
});

describe("the land that comes with the routes", () => {
  for (const route of ROUTES) {
    it(`${route.key} has its land, made for it, heights and all`, () => {
      expect(route.land).toBeDefined();
      const path = `public${route.land}`;
      // Fetched with the route on a phone: kept small.
      expect(statSync(path).size).toBeLessThan(1_000_000);
      const own = buildCourse(readRouteGpx(readFileSync(`public${route.file}`, "utf8")));
      const land = readLand(JSON.parse(readFileSync(path, "utf8")), own)!;
      expect(land).not.toBeNull();
      // The model agrees with the road's own heights, but for where the road
      // runs at the foot of a slope (the fjord below Munkebjerg) or cuts
      // down into a hill: there the land beside it is the model's.
      const off: number[] = [];
      for (let i = 0; i < own.x.length; i += 10) {
        off.push(Math.abs(land.heightAt(own.x[i]!, own.y[i]!)! - own.ele[i]!));
        // Land as far round as the landscape is drawn.
        for (const [dx, dy] of [
          [2400, 0],
          [-2400, 0],
          [0, 2400],
          [0, -2400],
        ] as const)
          expect(land.heightAt(own.x[i]! + dx, own.y[i]! + dy)).not.toBeNull();
      }
      off.sort((a, b) => a - b);
      expect(off[Math.floor(off.length / 2)]).toBeLessThan(2);
      expect(off[Math.floor(off.length * 0.9)]).toBeLessThan(10);
      expect(off.at(-1)).toBeLessThan(25);
      const kinds = new Set(land.areas.map((a) => a.kind));
      if ("city" in route && route.city) {
        // A city: its streets and blocks, its parks, its water, its street trees.
        for (const k of ["town", "meadow", "water", "cemetery"] as const)
          expect(kinds).toContain(k);
        expect(land.buildings.length).toBeGreaterThan(3000);
        expect(land.trees.length).toBeGreaterThan(300);
      } else {
        for (const k of ["field", "forest", "water", "town"] as const) expect(kinds).toContain(k);
        expect(land.buildings.length).toBeGreaterThan(500);
      }
    });
  }

  it("the queen stage has every building in its land, all of Odder's (ADR 0045)", () => {
    const route = ROUTES.find((r) => r.key === "tour-de-himmelfart-2026")!;
    const own = buildCourse(readRouteGpx(readFileSync(`public${route.file}`, "utf8")));
    const land = readLand(JSON.parse(readFileSync(`public${route.land}`, "utf8")), own)!;
    // As far as the landscape is drawn, so none is made up.
    expect(land.reach).toBe(2600);
    const fromRoad = (b: { x: number; y: number }) => {
      let best = Infinity;
      for (let i = 0; i < own.x.length; i += 5)
        best = Math.min(best, Math.hypot(own.x[i]! - b.x, own.y[i]! - b.y));
      return best;
    };
    const far = land.buildings.filter((b) => fromRoad(b) > MAPPED);
    expect(far.length).toBeGreaterThan(5000);
    // Odder Kirke, 2.8 km from the start, on the skyline over the town.
    const church = land.buildings.find(
      (b) => b.kind === "church" && Math.hypot(b.x - 1410, b.y + 2512) < 20,
    );
    expect(church).toBeDefined();
  });
});
