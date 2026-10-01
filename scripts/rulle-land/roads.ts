import { LAND_KINDS, type RoadKind } from "@/modules/rulle";
import type { P } from "./shapes";

/**
 * The roads round a route, for the land script (ADR 0045): what kind of
 * road a way is and whether it is paved, from its tags; and the pieces of
 * it that are not the route itself.
 */

type Tags = Record<string, string | undefined>;

const KINDS: Record<string, RoadKind> = {
  motorway: "main",
  motorway_link: "main",
  trunk: "main",
  trunk_link: "main",
  primary: "main",
  primary_link: "main",
  secondary: "main",
  secondary_link: "main",
  tertiary: "minor",
  tertiary_link: "minor",
  unclassified: "minor",
  residential: "minor",
  living_street: "minor",
  pedestrian: "minor",
  road: "minor",
  service: "service",
  busway: "service",
  track: "track",
  cycleway: "cycle",
  footway: "foot",
  path: "foot",
  bridleway: "foot",
};

const PAVED = new Set([
  "asphalt",
  "paved",
  "concrete",
  "concrete:plates",
  "concrete:lanes",
  "paving_stones",
  "sett",
  "cobblestone",
  "unhewn_cobblestone",
  "bricks",
  "chipseal",
  "metal",
  "wood",
]);
const UNPAVED = new Set([
  "unpaved",
  "gravel",
  "fine_gravel",
  "compacted",
  "pebblestone",
  "dirt",
  "earth",
  "ground",
  "grass",
  "grass_paver",
  "sand",
  "mud",
  "rock",
  "woodchips",
]);

/**
 * A road the land shows, and whether it is unpaved; null for a way that is
 * not one: steps, a platform, one planned or being built, an area, or a
 * tunnel, which runs under the land.
 */
export function roadOf(t: Tags): { kind: RoadKind; unpaved: boolean } | null {
  const kind = t.highway ? KINDS[t.highway] : undefined;
  if (!kind || t.area === "yes" || t.indoor) return null;
  if (t.tunnel && t.tunnel !== "no" && t.tunnel !== "building_passage") return null;
  const surface = t.surface ?? "";
  const unpaved = UNPAVED.has(surface)
    ? true
    : PAVED.has(surface)
      ? false
      : kind === "track"
        ? t.tracktype !== "grade1"
        : kind === "foot" && t.highway !== "footway";
  return { kind, unpaved };
}

export const roadIndex = (kind: RoadKind) => LAND_KINDS.roads.indexOf(kind);

/**
 * The pieces of a road the route does not run along. Where the route runs
 * down a road, that stretch is the route's own to draw; a side road keeps
 * the point where it leaves the route, so it meets it. `isRoute` says
 * whether the road from one point to the next is the route's: `line`
 * should be close-spaced, so no step runs both on it and off it.
 */
export function offRoute(line: P[], isRoute: (a: P, b: P) => boolean): P[][] {
  const pieces: P[][] = [];
  let piece: P[] = [];
  for (let k = 0; k + 1 < line.length; k++) {
    if (isRoute(line[k]!, line[k + 1]!)) {
      if (piece.length >= 2) pieces.push(piece);
      piece = [];
      continue;
    }
    if (piece.length === 0) piece.push(line[k]!);
    piece.push(line[k + 1]!);
  }
  if (piece.length >= 2) pieces.push(piece);
  return pieces;
}
