import { serveMap } from "@/core/map/serve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The detail map — Denmark and the training camps at full zoom — by byte ranges (ADR 0023, 0099). */
export async function GET(request: Request) {
  return serveMap(request, "detail");
}
