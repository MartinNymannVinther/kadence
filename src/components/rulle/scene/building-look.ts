import { CITIES, type City } from "@/modules/rulle";
import { PALETTE } from "./palette";

/**
 * How a place builds: its houses' walls and its flats', its churches'
 * roofs, stairs outside (Montréal's plexes, ADR 0036), and whether its
 * blocks are a big city's (Copenhagen's, `building-city.ts`, ADR 0045) or
 * a country town's.
 */
export type Look = {
  walls: readonly string[];
  blockWalls: readonly string[];
  churchRoof: string;
  stairs: boolean;
  big: boolean;
};

/** How the country builds, and each city. */
export function lookOf(city: City | null): Look {
  const face = city ? CITIES[city] : null;
  const plexes = face?.walls === "montreal";
  const big = face?.walls === "copenhagen";
  return {
    walls: plexes ? PALETTE.plexWalls : big ? PALETTE.cityWalls : PALETTE.walls,
    blockWalls: plexes ? PALETTE.plexBlocks : big ? PALETTE.cityWalls : PALETTE.blockWalls,
    churchRoof:
      face?.churchRoofs === "copper"
        ? PALETTE.copper
        : face?.churchRoofs === "tin"
          ? PALETTE.tin
          : PALETTE.roofRed,
    stairs: face?.stairs ?? false,
    big,
  };
}
