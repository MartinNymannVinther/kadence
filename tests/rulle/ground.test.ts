import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { herdsHere } from "@/components/rulle/scene/farmyard";
import { Ground, groundAt, ROAD_HALF, sink, STREET, VERGE } from "@/components/rulle/scene/ground";
import { hash, hills, valueNoise } from "@/components/rulle/scene/noise";
import { buildCourse, readLand, readRouteGpx } from "@/modules/rulle";

const vejle = buildCourse(
  readRouteGpx(readFileSync("public/rulle/routes/vejle-munkebjerg.gpx", "utf8")),
);
const ground = new Ground(vejle);
const ry = buildCourse(
  readRouteGpx(readFileSync("public/rulle/routes/ry-himmelbjerget.gpx", "utf8")),
);
const ryLand = readLand(
  JSON.parse(readFileSync("public/rulle/routes/ry-himmelbjerget.land.json", "utf8")),
  ry,
)!;
const real = new Ground(ry, ryLand);

/** The land `off` metres right of the road at sample `i`, in world coordinates. */
function beside(course: typeof ry, i: number, off: number) {
  const x = course.x[i]!;
  const z = -course.y[i]!;
  const next = (i + 1) % course.x.length;
  const dx = course.x[next]! - x;
  const dz = -course.y[next]! - z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: x + (-dz / len) * off, z: z + (dx / len) * off };
}

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
    const kinds: Record<string, number> = { field: 0, pasture: 0, forest: 0, conifer: 0 };
    for (let i = 0; i < 60; i++)
      for (let j = 0; j < 60; j++) kinds[ground.patch(i * 97, j * 89).kind]! += 1;
    const total = 3600;
    const woods = (kinds.forest! + kinds.conifer!) / total;
    expect(Object.keys(kinds)).toHaveLength(4);
    expect(woods).toBeGreaterThan(0.05);
    expect(woods).toBeLessThan(0.25);
    expect(kinds.conifer).toBeGreaterThan(0);
    expect(kinds.field).toBeGreaterThan(kinds.pasture!);
    expect(ground.patch(100, 200)).toEqual(ground.patch(100, 200));
  });
});

describe("the real land beside the road", () => {
  it("never covers the road either", () => {
    for (let i = 0; i < ry.x.length; i += 7)
      for (const off of [-12, 12]) {
        const { x, z } = beside(ry, i, off);
        // Below the road where it is nearest: on a bend, that is not always sample i.
        const road = real.nearest(x, z);
        expect(real.height(x, z), `sample ${i}, ${off} m`).toBeLessThan(road.ele + 0.05);
      }
  });

  it("is the height model's away from the road, the lakes' beds below their water", () => {
    let lakes = 0;
    for (let i = 0; i < ry.x.length; i += 25)
      for (const off of [-300, 300]) {
        const { x, z } = beside(ry, i, off);
        const level = real.lake(x, z);
        const model = ryLand.heightAt(x, -z)!;
        if (level === null) {
          if (real.nearest(x, z).d > 60) expect(real.height(x, z)).toBeCloseTo(model, 6);
        } else {
          lakes += 1;
          expect(real.height(x, z)).toBeLessThan(level);
          expect(real.patch(x, z).kind).toBe("water");
          expect(real.wet(x, z)).toBe(true);
          expect(real.grazing(x, z)).toBe(false);
        }
      }
    // Julsø and the lakes by Ry are there.
    expect(lakes).toBeGreaterThan(10);
  });

  it("has its woods and fields where the map has them, and no made-up woods", () => {
    const kinds = new Map<string, number>();
    for (let i = 0; i < ry.x.length; i += 5)
      for (const off of [-150, 150]) {
        const { x, z } = beside(ry, i, off);
        const kind = real.patch(x, z).kind;
        kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
        if (kind === "forest" || kind === "conifer") expect(real.grazing(x, z)).toBe(false);
        if (ryLand.coverAt(x, -z) === null) expect(["field", "pasture"]).toContain(kind);
      }
    expect(kinds.get("forest")! + (kinds.get("conifer") ?? 0)).toBeGreaterThan(20);
    expect(kinds.get("water")).toBeGreaterThan(5);
  });
});

describe("a city's street", () => {
  const cph = buildCourse(
    readRouteGpx(readFileSync("public/rulle/routes/future-racing-2026-kobenhavn.gpx", "utf8")),
  );
  const cphLand = readLand(
    JSON.parse(readFileSync("public/rulle/routes/future-racing-2026-kobenhavn.land.json", "utf8")),
    cph,
  )!;
  const city = new Ground(cph, cphLand, true);

  it("steps up a kerb to the cycle track, and again to the pavement", () => {
    const out = (m: number) => groundAt(ROAD_HALF + m, 0.4, true);
    expect(out(0)).toBe(0);
    expect(out(STREET.kerb)).toBeCloseTo(STREET.trackLift, 6);
    expect(out(1)).toBeCloseTo(STREET.trackLift, 6);
    expect(out(STREET.track + STREET.kerb)).toBeCloseTo(STREET.pavementLift, 6);
    expect(out(4)).toBeCloseTo(STREET.pavementLift, 6);
    // Beyond the pavement, down to the land.
    expect(out(VERGE)).toBeCloseTo(-0.4, 6);
    expect(out(STREET.pavement + 0.5)).toBeLessThan(STREET.pavementLift);
    expect(out(STREET.pavement + 0.5)).toBeGreaterThan(-0.4);
  });

  it("is paved where no one mapped anything, and has no herds in its parks", () => {
    let paved = 0;
    for (let i = 0; i < cph.x.length; i += 40)
      for (const off of [-120, 120]) {
        const { x, z } = beside(cph, i, off);
        if (cphLand.coverAt(x, -z) === null) {
          expect(city.patch(x, z).kind).toBe("town");
          paved += 1;
        }
        expect(city.grazing(x, z)).toBe(false);
      }
    expect(paved).toBeGreaterThan(0);
    expect(herdsHere(cph, city)).toEqual([]);
  });
});
