import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ground, ROAD_HALF } from "@/components/rulle/scene/ground";
import { ROAD_WIDTH, SideRoads } from "@/components/rulle/scene/side-roads";
import { drawnHeight } from "@/components/rulle/scene/terrain";
import { buildCourse, readLand, readRouteGpx } from "@/modules/rulle";

const odder = buildCourse(
  readRouteGpx(readFileSync("public/rulle/routes/tour-de-himmelfart-2026-odder.gpx", "utf8")),
);
const land = readLand(
  JSON.parse(readFileSync("public/rulle/routes/tour-de-himmelfart-2026-odder.land.json", "utf8")),
  odder,
)!;
const ground = new Ground(odder, land);
const roads = new SideRoads(land, ground);

describe("the roads round the queen stage (ADR 0045)", () => {
  it("are Odder's streets and the lanes and tracks round it, but not the route's own", () => {
    const kinds = new Set(land.roads.map((r) => r.kind));
    for (const k of ["main", "minor", "service", "track", "cycle", "foot"] as const)
      expect(kinds).toContain(k);
    expect(land.roads.some((r) => r.unpaved)).toBe(true);
    // No road runs along the route: where one is near it, it meets it or crosses it.
    let along = 0;
    for (const road of land.roads)
      for (let k = 0; k + 1 < road.points.length; k++) {
        const a = road.points[k]!;
        const b = road.points[k + 1]!;
        const m = { x: (a.x + b.x) / 2, z: -(a.y + b.y) / 2 };
        if (ground.nearest(m.x, m.z, 10).d < 2 && Math.hypot(b.x - a.x, b.y - a.y) > 25) along++;
      }
    expect(along).toBe(0);
  });

  it("lie on the land, a hand's breadth above it, and climb the verge to meet the route", () => {
    let pieces = 0;
    for (let cx = -8; cx <= 8; cx++)
      for (let cz = -8; cz <= 8; cz++) {
        const mesh = roads.build(cx, cz);
        if (!mesh) continue;
        const position = mesh.geometry.getAttribute("position");
        for (let i = 0; i < position.count; i++) {
          const x = position.getX(i);
          const y = position.getY(i);
          const z = position.getZ(i);
          expect(Number.isFinite(y)).toBe(true);
          const near = ground.nearest(x, z, 20);
          // Off the route's verge, on the land; on it, between the land and the asphalt.
          if (near.d > 12)
            expect(Math.abs(y - drawnHeight(ground, x, z) - 0.12)).toBeLessThan(0.05);
          else expect(y).toBeLessThan(near.ele + 0.2);
          pieces++;
        }
        // A side road meets the route's asphalt at its edge, and never covers its middle line.
        for (let i = 0; i < position.count; i += 3) {
          const x = (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3;
          const z = (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3;
          expect(ground.nearest(x, z, 10).d).toBeGreaterThan(ROAD_HALF - 2);
        }
        mesh.geometry.dispose();
      }
    expect(pieces).toBeGreaterThan(10_000);
  });

  it("are where nothing else stands, and nowhere else", () => {
    const street = land.roads.find((r) => r.kind === "minor" && r.points.length > 3)!;
    const p = street.points[1]!;
    expect(roads.on(p.x, -p.y)).toBe(true);
    // Beside it, past its edge and the room left by it.
    const q = street.points[2]!;
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    const off = ROAD_WIDTH.minor / 2 + 1;
    const beside = { x: p.x + ((q.y - p.y) / len) * off, z: -(p.y - ((q.x - p.x) / len) * off) };
    expect(roads.on(beside.x, beside.z, 1.5)).toBe(true);
    expect(roads.on(beside.x + ((q.y - p.y) / len) * 20, beside.z + ((q.x - p.x) / len) * 20)).toBe(
      false,
    );
  });
});
