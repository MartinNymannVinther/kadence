import { CITIES, type City } from "@/modules/rulle";
import { PALETTE } from "./palette";

/** How a city builds: its houses' walls and its flats', its churches' roofs, and stairs outside. */
export type Look = {
  walls: readonly string[];
  blockWalls: readonly string[];
  churchRoof: string;
  stairs: boolean;
};

/** How the country builds, and each city. */
export function lookOf(city: City | null): Look {
  const face = city ? CITIES[city] : null;
  const plexes = face?.walls === "montreal";
  return {
    walls: plexes ? PALETTE.plexWalls : PALETTE.walls,
    blockWalls: plexes ? PALETTE.plexBlocks : PALETTE.blockWalls,
    churchRoof:
      face?.churchRoofs === "copper"
        ? PALETTE.copper
        : face?.churchRoofs === "tin"
          ? PALETTE.tin
          : PALETTE.roofRed,
    stairs: face?.stairs ?? false,
  };
}
