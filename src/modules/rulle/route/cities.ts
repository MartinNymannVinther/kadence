import type { City } from "./routes";

/**
 * The face of each city a route that comes with Kadence runs through
 * (ADR 0036), as it is on its race's day: the trees as they stand in that
 * month and where the sun stands in the sky; how its streets are lit;
 * what stands at the kerb for a cold drink in a pause; its churches'
 * roofs and its houses' walls, and whether the houses climb to their
 * doors by stairs outside; and the landmark by the course that the map
 * has no building for. Pure.
 */

export type CityFace = {
  /** June's full green, or September's maples turning red. */
  trees: "summer" | "maples";
  /** The sun on race day: its bearing, degrees clockwise from north, and its height, degrees. */
  sun: { bearing: number; height: number };
  /** Lamps hung on wires across the street, or on posts beside it. */
  lamps: "wires" | "posts";
  /** The stand at the kerb: a hot-dog wagon, or a corner shop. */
  stand: "polsevogn" | "depanneur";
  /** Green copper, or tin. */
  churchRoofs: "copper" | "tin";
  /** Brick and stucco in ochre and white, or the red and brown brick and grey stone of the plexes. */
  walls: "copenhagen" | "montreal";
  /** The plexes' stairs, up the front to the doors of the floors above. */
  stairs: boolean;
  landmarks: { kind: "cross"; lat: number; lon: number; height: number }[];
};

export const CITIES: Record<City, CityFace> = {
  kobenhavn: {
    trees: "summer",
    // Future Racing is ridden on a morning in the middle of June (14 June
    // 2026, before the professionals): at half past nine the sun stands in
    // the east-south-east, about 39° up (55.7° N, declination +23.2°).
    sun: { bearing: 106, height: 39 },
    lamps: "wires",
    stand: "polsevogn",
    churchRoofs: "copper",
    walls: "copenhagen",
    stairs: false,
    landmarks: [],
  },
  montreal: {
    trees: "maples",
    // The Worlds' road races, 20–27 September 2026, pass the circuit in the
    // afternoon: at half past two on the last day the sun stands in the
    // south-south-west, about 38° up (45.5° N, declination -1.4°).
    sun: { bearing: 214, height: 38 },
    lamps: "posts",
    stand: "depanneur",
    churchRoofs: "tin",
    walls: "montreal",
    stairs: true,
    landmarks: [
      // La croix du mont Royal, steel, 1924, 31.4 m (OpenStreetMap node
      // 1330276952; Ville de Montréal, "Croix du mont Royal").
      { kind: "cross", lat: 45.5088387, lon: -73.5879016, height: 31.4 },
    ],
  },
};

/** A bearing and a height, as a direction toward the sun in the landscape: x east, y up, z south. */
export function sunToward(sun: CityFace["sun"]): { x: number; y: number; z: number } {
  const b = (sun.bearing * Math.PI) / 180;
  const h = (sun.height * Math.PI) / 180;
  return { x: Math.sin(b) * Math.cos(h), y: Math.sin(h), z: -Math.cos(b) * Math.cos(h) };
}
