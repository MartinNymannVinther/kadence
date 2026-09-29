import { handleIngest, handleIngestCheck } from "@/modules/devices/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A ride file handed over with a rider's upload key (docs/adr/0029):
 * `Authorization: Bearer kad_…` and the file as the body, or as the
 * `file` field of a form. Rate limited, the key checked before the body
 * is read, the file capped and imported as the rider
 * (src/modules/devices/ingest.ts).
 */
export async function POST(request: Request) {
  return handleIngest(request);
}

/** A helper asking whether its key works: 200 or 401, and nothing about the rider. */
export async function GET(request: Request) {
  return handleIngestCheck(request);
}
