import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gridTriangle, GRID } from "@/components/rulle/scene/grid-triangle";
import { Ground, groundAt, ROAD_HALF, VERGE } from "@/components/rulle/scene/ground";
import { clearedCorners } from "@/components/rulle/scene/road-clear";
import { sections } from "@/components/rulle/scene/road";
import { drawnHeight } from "@/components/rulle/scene/terrain";
import { buildCourse, readLand, readRouteGpx, structuresOn, type Course } from "@/modules/rulle";

/**
 * The land never covers the road (docs/adr/0108). Measured where it was
 * seen to: on the drawn triangles, not the smooth ground between their
 * corners, every 2.5 m along each bundled route and every metre across
 * its asphalt and verges.
 */

function route(name: string, city = false) {
  const course = buildCourse(readRouteGpx(readFileSync(`public/rulle/routes/${name}.gpx`, "utf8")));
  const land = readLand(
    JSON.parse(readFileSync(`public/rulle/routes/${name}.land.json`, "utf8")),
    course,
  )!;
  const found = structuresOn(course, land.structures);
  return { course, ground: new Ground(course, land, city ? "kobenhavn" : null, found.decks) };
}

/** The most the drawn land rises over the road's own surface, on the asphalt and on the verges. */
function worst(course: Course, ground: Ground) {
  const all = sections(course);
  let asphalt = -Infinity;
  let verge = -Infinity;
  for (let i = 0; i < all.length; i++) {
    if (ground.onDeck(i * course.step) || ground.onDeck((i + 1) * course.step)) continue;
    const s = all[i]!;
    const t = all[(i + 1) % all.length]!;
    for (const f of [0, 0.25, 0.5, 0.75]) {
      const cx = s.cx + (t.cx - s.cx) * f;
      const cy = s.cy + (t.cy - s.cy) * f;
      const cz = s.cz + (t.cz - s.cz) * f;
      const sunk = s.sunk + (t.sunk - s.sunk) * f;
      for (let off = -(ROAD_HALF + VERGE); off <= ROAD_HALF + VERGE; off += 1) {
        const surface = cy + groundAt(off, sunk, ground.city !== null);
        const over = drawnHeight(ground, cx + s.rx * off, cz + s.rz * off) - surface;
        if (Math.abs(off) <= ROAD_HALF) asphalt = Math.max(asphalt, over);
        else verge = Math.max(verge, over);
      }
    }
  }
  return { asphalt, verge };
}

describe("the land beside the road, as it is drawn (docs/adr/0108)", () => {
  // Vejle's fjord and Munkebjerg had the hill 3.7 m over the verge; the city, a kerb's worth over the asphalt.
  for (const [name, city] of [
    ["vejle-munkebjerg", false],
    ["bu-dm-2026-vejle", false],
    ["ry-himmelbjerget", false],
    ["future-racing-2026-kobenhavn", true],
  ] as const)
    it(`never covers the asphalt or the verge on ${name}`, () => {
      const { course, ground } = route(name, city);
      const { asphalt, verge } = worst(course, ground);
      expect(asphalt).toBeLessThan(0);
      // At the verge's foot the land meets it; a few centimetres of the triangles' facets.
      expect(verge).toBeLessThan(0.15);
    });

  it("is lowered only near the road, and never raised", () => {
    const { course, ground } = route("vejle-munkebjerg");
    const raw = (a: number, b: number) => ground.height(a * GRID, b * GRID);
    const lowered = clearedCorners(course, { city: false, onDeck: (d) => ground.onDeck(d) }, raw);
    expect(lowered.size).toBeGreaterThan(0);
    for (const [key, h] of lowered) {
      const a = Math.round(key / 262_144);
      const b = key - a * 262_144;
      expect(h).toBeLessThan(raw(a, b));
      // Within a triangle's reach of the road: a corner of one the road or its verge lies in.
      expect(ground.nearest(a * GRID, b * GRID, 60).d).toBeLessThan(GRID * Math.SQRT2 + 11);
    }
  });
});

describe("the terrain's triangles", () => {
  it("weigh their three corners to one, and give a corner's own height at the corner", () => {
    for (const [x, z] of [
      [3, 4],
      [24, 1],
      [-60.5, 12.25],
      [37.5, -80],
      [50, 50],
    ]) {
      const { corners, weights } = gridTriangle(x!, z!);
      expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      for (const w of weights) expect(w).toBeGreaterThanOrEqual(-1e-12);
      // The place is the weighted corners.
      const px = corners.reduce((a, c, k) => a + c[0] * GRID * weights[k]!, 0);
      const pz = corners.reduce((a, c, k) => a + c[1] * GRID * weights[k]!, 0);
      expect(px).toBeCloseTo(x!, 9);
      expect(pz).toBeCloseTo(z!, 9);
    }
  });
});
