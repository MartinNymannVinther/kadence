import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The regions the detail map covers (scripts/map-regions.geojson,
 * docs/adr/0099): a GeoJSON MultiPolygon go-pmtiles reads, with Denmark
 * and every training camp inside it.
 */

type Ring = [number, number][];
const geojson = JSON.parse(readFileSync("scripts/map-regions.geojson", "utf8")) as {
  type: string;
  features: {
    type: string;
    properties: { regions: string[] };
    geometry: { type: string; coordinates: Ring[][] };
  }[];
};

/** Where riders ride, as [lon, lat]. */
const PLACES: Record<string, [number, number]> = {
  Copenhagen: [12.568, 55.676],
  Skagen: [10.591, 57.721],
  Gedser: [11.926, 54.574],
  Rønne: [14.703, 55.103],
  Palma: [2.65, 39.57],
  "Port de Pollença": [3.085, 39.906],
  Girona: [2.821, 41.979],
  Rocacorba: [2.701, 42.069],
  Cadaqués: [3.277, 42.288],
  Olot: [2.491, 42.181],
  Calpe: [0.044, 38.644],
  "Coll de Rates": [-0.093, 38.729],
  Alicante: [-0.481, 38.345],
  "Las Palmas": [-15.428, 28.124],
  Maspalomas: [-15.586, 27.76],
  "Santa Cruz de Tenerife": [-16.255, 28.463],
  "El Teide": [-16.642, 28.272],
  Arrecife: [-13.551, 28.963],
  "Playa Blanca": [-13.829, 28.864],
};

const polygons = geojson.features.flatMap((f) => f.geometry.coordinates);

function inside([x, y]: [number, number], ring: Ring): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Twice the signed area; positive is counterclockwise, as GeoJSON's outer rings are. */
const area2 = (ring: Ring) =>
  ring.slice(1).reduce((sum, [x, y], i) => sum + ring[i]![0] * y - x * ring[i]![1], 0);

describe("the regions in detail", () => {
  it("is one MultiPolygon of closed, counterclockwise rings on the globe", () => {
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features).toHaveLength(1);
    expect(geojson.features[0]!.geometry.type).toBe("MultiPolygon");
    expect(polygons.length).toBeGreaterThanOrEqual(7);
    // A name for every region, in the same order.
    expect(geojson.features[0]!.properties.regions).toHaveLength(polygons.length);
    for (const polygon of polygons) {
      expect(polygon).toHaveLength(1);
      const ring = polygon[0]!;
      expect(ring.length).toBeGreaterThanOrEqual(4);
      expect(ring.at(-1)).toEqual(ring[0]);
      expect(area2(ring)).toBeGreaterThan(0);
      for (const [lon, lat] of ring) {
        expect(Math.abs(lon)).toBeLessThanOrEqual(180);
        expect(Math.abs(lat)).toBeLessThanOrEqual(85);
      }
    }
  });

  for (const [name, point] of Object.entries(PLACES))
    it(`holds ${name}`, () => {
      expect(polygons.some((polygon) => inside(point, polygon[0]!))).toBe(true);
    });

  it("leaves the rest of the world to the world file", () => {
    for (const point of [
      [4.35, 50.85], // Brussels
      [11.35, 46.5], // Bolzano
      [-3.7, 40.42], // Madrid
    ] as [number, number][])
      expect(polygons.some((polygon) => inside(point, polygon[0]!))).toBe(false);
  });
});
