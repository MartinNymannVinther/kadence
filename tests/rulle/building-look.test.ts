import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { buildingsMesh, lookOf, type Footprint } from "@/components/rulle/scene/buildings";
import { PALETTE } from "@/components/rulle/scene/palette";

/** A block of five storeys on a street, its long side to the road. */
const street: Footprint = {
  x: 0,
  z: 0,
  w: 40,
  d: 12,
  angle: 0,
  kind: "house",
  levels: 5,
  seed: 7,
  far: 20,
  road: { x: 0, z: 14 },
};
const flat = () => 0;
const material = new THREE.MeshBasicMaterial();

/** The colours a mesh is painted in, as hex. */
function colours(mesh: THREE.Mesh): Set<string> {
  const colour = mesh.geometry.getAttribute("color");
  const out = new Set<string>();
  for (let i = 0; i < colour.count; i++)
    out.add(`#${new THREE.Color(colour.getX(i), colour.getY(i), colour.getZ(i)).getHexString()}`);
  return out;
}

describe("how a place builds", () => {
  it("knows Copenhagen for a big city, a country town for none, and Montréal by its plexes", () => {
    expect(lookOf("kobenhavn")).toMatchObject({ big: true, stairs: false });
    expect(lookOf("kobenhavn").blockWalls).toEqual(PALETTE.cityWalls);
    expect(lookOf(null)).toMatchObject({ big: false, stairs: false });
    expect(lookOf(null).walls).toEqual(PALETTE.walls);
    expect(lookOf("montreal")).toMatchObject({ big: false, stairs: true });
  });

  it("builds a big city's block taller, with a cornice, a slate roof and shops on the street", () => {
    const city = buildingsMesh([street], flat, material, () => 5, lookOf("kobenhavn"))!;
    const town = buildingsMesh([street], flat, material, () => 5, lookOf(null))!;
    city.geometry.computeBoundingBox();
    town.geometry.computeBoundingBox();
    expect(city.geometry.boundingBox!.max.y).toBeGreaterThan(town.geometry.boundingBox!.max.y);
    const painted = colours(city);
    expect(painted.has(PALETTE.cornice)).toBe(true);
    expect(painted.has(PALETTE.shopGlass)).toBe(true);
    expect(PALETTE.slate.some((s) => painted.has(s))).toBe(true);
    expect(colours(town).has(PALETTE.shopGlass)).toBe(false);
  });

  it("keeps shops to the street: a block far from the road has none", () => {
    const back = { ...street, far: 120 };
    const city = buildingsMesh([back], flat, material, () => 5, lookOf("kobenhavn"))!;
    expect(colours(city).has(PALETTE.shopGlass)).toBe(false);
  });
});
