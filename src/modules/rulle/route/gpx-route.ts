import { FitError } from "@/modules/fit";
import { scanXml } from "@/modules/files/xml";

/**
 * A route for Rulle from a GPX file: where the road goes and how high it
 * is, nothing else. What route planners write — Komoot, Strava's route
 * builder, Garmin Connect, RideWithGPS, BRouter — is a track (`trkpt`) or
 * a route (`rtept`) of positions with an elevation (`ele`) each and no
 * times; a ride recorded outdoors is a track with times, and reads the
 * same way.
 *
 * Kadence's own XML reader does the reading (src/modules/files/xml.ts: no
 * document type declarations, elements and nesting capped), and a file
 * that cannot be a route to ride is refused rather than guessed at: no
 * points, too many, or too few heights to draw a hill from — a route
 * without elevation would be a flat line, and the profile is the point.
 * A point without a height between two that have one takes the line
 * between them.
 *
 * Pure: it runs in the browser, where a rider's own file is read and
 * stays, and in the tests.
 */

export const ROUTE_LIMITS = {
  /** Characters of XML; a planner's file for a long day is a few megabytes. */
  maxChars: 10 * 1024 * 1024,
  maxPoints: 200_000,
  /** The share of points that must carry a height. */
  minElevationShare: 0.9,
} as const;

export type RoutePoint = { lat: number; lon: number; ele: number };
export type RouteFile = { name: string; points: RoutePoint[] };

export type RouteErrorCode =
  "not_gpx" | "no_points" | "no_elevation" | "too_large" | "too_short" | "corrupt";

export class RouteError extends Error {
  constructor(
    readonly code: RouteErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RouteError";
  }
}

type Draft = { lat: number; lon: number; ele: number | null };

const num = (text: string) => {
  const value = Number(text);
  return text.trim() !== "" && Number.isFinite(value) ? value : undefined;
};

export function readRouteGpx(xml: string): RouteFile {
  if (xml.length > ROUTE_LIMITS.maxChars) throw new RouteError("too_large", "The file is too big.");
  const track: Draft[] = [];
  const route: Draft[] = [];
  const stack: string[] = [];
  const names: Record<"metadata" | "trk" | "rte", string | undefined> = {
    metadata: undefined,
    trk: undefined,
    rte: undefined,
  };
  let root: string | undefined;
  let point: Draft | null = null;
  let count = 0;

  try {
    scanXml(xml, {
      open(name, attrs) {
        root ??= name;
        stack.push(name);
        if (name !== "trkpt" && name !== "rtept") return;
        if (++count > ROUTE_LIMITS.maxPoints) throw new RouteError("too_large", "Too many points.");
        const lat = num(attrs.lat ?? "");
        const lon = num(attrs.lon ?? "");
        point =
          lat !== undefined && lon !== undefined && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
            ? { lat, lon, ele: null }
            : null;
      },
      close(name) {
        stack.pop();
        if ((name === "trkpt" || name === "rtept") && point)
          (name === "trkpt" ? track : route).push(point);
        if (name === "trkpt" || name === "rtept") point = null;
      },
      text(text) {
        const name = stack.at(-1);
        const parent = stack.at(-2);
        if (point) {
          if (name === "ele") point.ele = num(text) ?? null;
          return;
        }
        if (name === "name" && (parent === "metadata" || parent === "trk" || parent === "rte"))
          names[parent] ??= text.slice(0, 120);
      },
    });
  } catch (error) {
    if (error instanceof RouteError) throw error;
    if (error instanceof FitError)
      throw new RouteError(error.code === "too_large" ? "too_large" : "corrupt", error.message);
    throw error;
  }

  if (root !== "gpx") throw new RouteError("not_gpx", "Not a GPX file.");
  // A file with both is a track drawn over a planned route; the track is the detailed one.
  const drafts = track.length >= 2 ? track : route;
  if (drafts.length < 2) throw new RouteError("no_points", "No track or route points.");
  return {
    name: (names.metadata ?? names.trk ?? names.rte ?? "").trim(),
    points: withHeights(drafts),
  };
}

/** Every point with a height: the gaps filled along the line, the ends from the nearest known. */
function withHeights(drafts: Draft[]): RoutePoint[] {
  const known = drafts.filter((d) => d.ele !== null && Math.abs(d.ele) < 9000).length;
  if (known / drafts.length < ROUTE_LIMITS.minElevationShare)
    throw new RouteError("no_elevation", "Too few points carry an elevation.");
  const heights = drafts.map((d) => (d.ele !== null && Math.abs(d.ele) < 9000 ? d.ele : null));
  let last: number | null = null;
  for (let i = 0; i < heights.length; i++) {
    if (heights[i] !== null) {
      const from = last === null ? 0 : last + 1;
      const start = last === null ? heights[i]! : heights[last]!;
      for (let j = from; j < i; j++)
        heights[j] =
          last === null ? start : start + ((heights[i]! - start) * (j - last)) / (i - last);
      last = i;
    }
  }
  for (let j = (last ?? 0) + 1; j < heights.length; j++) heights[j] = heights[last ?? 0]!;
  return drafts.map((d, i) => ({ lat: d.lat, lon: d.lon, ele: heights[i]! }));
}
