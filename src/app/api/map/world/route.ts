import { serveMap } from "@/core/map/serve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The world map at low zoom, under the detail map, by byte ranges (ADR 0099). */
export async function GET(request: Request) {
  return serveMap(request, "world");
}
