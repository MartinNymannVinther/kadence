import { z } from "zod";
import { Refused } from "@/core/action";
import { requireOrgContext } from "@/core/auth/guard";
import { rateLimit } from "@/core/rate-limit";
import { fromAnotherSite } from "@/core/same-site";
import { DeviceHttpError, loggable, readLimited } from "@/modules/devices/http";
import { knownFileHashes, MAX_KNOWN_HASHES } from "@/modules/devices/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
/** A list of hashes is small; this is room for a device's whole folder and no more. */
const MAX_BODY_BYTES = 64 * 1024;

const input = z.object({
  riderId: z.string().min(1).max(100),
  hashes: z
    .array(z.string().regex(/^[0-9a-f]{64}$/))
    .min(1)
    .max(MAX_KNOWN_HASHES),
});

/**
 * Which of these files Kadence already holds for a rider, by sha256, for
 * the rider or a coach: what lets "Hent fra enheden" read a whole folder
 * from a bike computer and send only the rides that are new
 * (src/components/activities/read-device-folder.ts). A route rather than
 * an action because it is a read, and the pages are not refreshed by it.
 */
export async function POST(request: Request) {
  if (fromAnotherSite(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  const ctx = await requireOrgContext();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!(await rateLimit(`upload-known:${ctx.userId}`, 60, HOUR)).allowed)
    return Response.json({ error: "rateLimited" }, { status: 429 });

  // Counted as it arrives: a body without a length has none to trust.
  let raw: unknown;
  try {
    const body = await readLimited(
      request.body,
      MAX_BODY_BYTES,
      request.headers.get("content-length"),
    );
    raw = JSON.parse(new TextDecoder().decode(body));
  } catch (error) {
    const tooLarge = error instanceof DeviceHttpError && error.code === "too_large";
    return Response.json(
      { error: tooLarge ? "too_large" : "invalid" },
      { status: tooLarge ? 413 : 400 },
    );
  }
  const parsed = input.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });

  try {
    const known = await knownFileHashes(ctx, parsed.data.riderId, parsed.data.hashes);
    return Response.json({ known }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Refused)
      return Response.json(
        { error: error.code },
        { status: error.code === "notFound" ? 404 : 403 },
      );
    console.error("known files: failed", loggable(error));
    return Response.json({ error: "generic" }, { status: 500 });
  }
}
