import { requireOrgContext } from "@/core/auth/guard";
import { rateLimit } from "@/core/rate-limit";
import { rangeResponse } from "./file";
import { mapFile } from "./installed";
import type { MapName } from "./paths";

const MINUTE = 60 * 1000;

/**
 * A map file, by byte ranges, for the map behind a ride's route
 * (ADR 0023, 0099); /api/map/tiles serves the detail file and
 * /api/map/world the world. Signed-in people only — the map is public
 * data, but the route that asks for it is not a public endpoint to be
 * scraped — and rate limited per person and file. One range per request,
 * capped: a PMTiles reader asks for a header, a directory or a tile,
 * never the whole file.
 */
export async function serveMap(request: Request, name: MapName): Promise<Response> {
  const ctx = await requireOrgContext();
  if (!ctx) return new Response(null, { status: 401 });
  const bucket = name === "detail" ? "map" : `map-${name}`;
  if (!(await rateLimit(`${bucket}:${ctx.userId}`, 1200, MINUTE)).allowed)
    return new Response(null, { status: 429 });
  const file = await mapFile(name);
  if (!file) return new Response(null, { status: 404 });
  return rangeResponse(request.headers.get("range"), file);
}
