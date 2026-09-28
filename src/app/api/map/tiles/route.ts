import { requireOrgContext } from "@/core/auth/guard";
import { MAX_RANGE_BYTES, mapSize, parseRange, readRange } from "@/core/map/file";
import { rateLimit } from "@/core/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MINUTE = 60 * 1000;

/**
 * The map file, by byte ranges, for the map behind a ride's route
 * (ADR 0023). Signed-in people only — the map is public data, but the
 * route that asks for it is not a public endpoint to be scraped — and
 * rate limited per person. One range per request, capped: a PMTiles
 * reader asks for a header, a directory or a tile, never the whole file.
 */
export async function GET(request: Request) {
  const ctx = await requireOrgContext();
  if (!ctx) return new Response(null, { status: 401 });
  if (!rateLimit(`map:${ctx.userId}`, 1200, MINUTE).allowed)
    return new Response(null, { status: 429 });
  const size = await mapSize();
  if (size === null) return new Response(null, { status: 404 });

  const range = parseRange(request.headers.get("range"), size);
  if (!range || range.end - range.start + 1 > MAX_RANGE_BYTES)
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  const bytes = await readRange(range.start, range.end);
  return new Response(bytes as Uint8Array<ArrayBuffer>, {
    status: 206,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
