import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ground, groundAt, ROAD_HALF, sink, VERGE } from "@/components/rulle/scene/ground";
import { hash, hills, valueNoise } from "@/components/rulle/scene/noise";
import { buildCourse, readRouteGpx } from "@/modules/rulle";

const vejle = buildCourse(
  readRouteGpx(readFileSync("public/rulle/routes/vejle-munkebjerg.gpx", "utf8")),
);
const ground = new Ground(vejle);

describe("the land beside the road", () => {
  it("lies a little below a flat road and further below a steep one", () => {
    const flat = vejle.grade.findIndex((g) => Math.abs(g) < 0.002);
    const steep = vejle.grade.findIndex((g) => Math.abs(g) > 0.1);
    expect(sink(vejle, flat)).toBeGreaterThanOrEqual(0.35);
    expect(sink(vejle, flat)).toBeLessThan(0.6);
    expect(sink(vejle, steep)).toBeGreaterThan(1.3);
    expect(sink(vejle, steep)).toBeLessThanOrEqual(2.4);
  });

  it("falls from the asphalt's edge along the verge and stays down beyond it", () => {
    expect(groundAt(0, 1)).toBe(0);
    expect(groundAt(ROAD_HALF, 1)).toBe(0);
    expect(groundAt(-(ROAD_HALF + VERGE / 2), 1)).toBeCloseTo(0.01 - 1.01 / 2, 6);
    expect(groundAt(ROAD_HALF + VERGE, 1)).toBeCloseTo(-1, 6);
    expect(groundAt(40, 1)).toBeCloseTo(-1, 6);
  });

  it("never covers the road: beside every sample of it, the land is below it", () => {
    for (let i = 0; i < vejle.x.length; i += 7) {
      const x = vejle.x[i]!;
      const z = -vejle.y[i]!;
      const next = (i + 1) % vejle.x.length;
      const dx = vejle.x[next]! - x;
      const dz = -vejle.y[next]! - z;
      const len = Math.hypot(dx, dz) || 1;
      for (const off of [-12, 12]) {
        const h = ground.height(x + (-dz / len) * off, z + (dx / len) * off);
        expect(h, `sample ${i}, ${off} m`).toBeLessThan(vejle.ele[i]! + 0.05);
      }
    }
  });

  it("rolls on its own far from the road", () => {
    const far = [0, 1, 2, 3].map((k) => ground.height(5_000 + k * 300, 5_000));
    expect(new Set(far.map((h) => Math.round(h))).size).toBeGreaterThan(1);
  });
});

describe("the same country every ride", () => {
  it("hashes and noise are the same for the same place", () => {
    expect(hash(12, -7, 3)).toBe(hash(12, -7, 3));
    expect(hash(12, -7, 3)).not.toBe(hash(12, -7, 4));
    for (let k = 0; k < 200; k++) {
      const v = valueNoise(k * 0.37, k * -0.61, 5);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(hills(1234, 5678)).toBe(hills(1234, 5678));
  });

  it("covers the land in fields, pasture and a share of woods", () => {
    const kinds = { field: 0, pasture: 0, forest: 0 };
    for (let i = 0; i < 60; i++)
      for (let j = 0; j < 60; j++) kinds[ground.patch(i * 97, j * 89).kind] += 1;
    const total = 3600;
    expect(kinds.forest / total).toBeGreaterThan(0.05);
    expect(kinds.forest / total).toBeLessThan(0.25);
    expect(kinds.field).toBeGreaterThan(kinds.pasture);
    expect(ground.patch(100, 200)).toEqual(ground.patch(100, 200));
  });
});
