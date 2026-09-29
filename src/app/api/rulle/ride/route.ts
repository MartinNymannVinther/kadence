import { createHash } from "node:crypto";
import { Refused } from "@/core/action";
import { requireOrgContext } from "@/core/auth/guard";
import { peekRateLimit, rateLimit } from "@/core/rate-limit";
import { fromAnotherSite } from "@/core/same-site";
import { DeviceHttpError, loggable } from "@/modules/devices/http";
import { importFit } from "@/modules/devices/import";
import { STORED_FILES_PER_HOUR, storedFilesKey } from "@/modules/devices/ingest";
import { readWithin } from "@/modules/devices/ingest-request";
import { rideByHash } from "@/modules/rulle/service";
import { whoAmI } from "@/modules/team/access";
import { getSession } from "@/modules/training/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A ride from Rulle is a few hundred kilobytes; this is more than a day on the trainer. */
export const MAX_RIDE_BYTES = 5 * 1024 * 1024;
const HOUR = 60 * 60 * 1000;
const NO_STORE = { "Cache-Control": "no-store" };

const answer = (body: object, status: number) => Response.json(body, { status, headers: NO_STORE });

/**
 * A ride from Rulle (ADR 0032): the FIT file the browser wrote, as the
 * request's body, for the rider who rode it. It goes through the same
 * import as any upload — decoded by Kadence's own reader, summarised,
 * given its load — and lands on the session it was ridden for
 * (`?session=`) when that is still open on the ride's day. A ride without
 * a session is named for its route (`?name=`).
 *
 * Only the rider saves their ride: a coach who tries a session on the
 * trainer is not the rider, and a session must be the rider's own. It is
 * counted with the upload — the same thirty requests and sixty kept files
 * an hour per person (ADR 0019, 0029) — and a file sent again because the
 * answer to the first was lost is answered with the ride it became.
 */
export async function POST(request: Request) {
  if (fromAnotherSite(request)) return answer({ error: "forbidden" }, 403);
  const ctx = await requireOrgContext();
  if (!ctx) return answer({ error: "unauthorized" }, 401);
  if (!rateLimit(`upload:${ctx.userId}`, 30, HOUR).allowed)
    return answer({ error: "rateLimited" }, 429);

  let bytes: Uint8Array;
  try {
    bytes = await readWithin(request.body, MAX_RIDE_BYTES, request.headers.get("content-length"));
  } catch (error) {
    const code = error instanceof DeviceHttpError ? error.code : "invalid";
    return answer(
      { error: code === "too_large" ? "too_large" : "invalid" },
      code === "too_large" ? 413 : 400,
    );
  }
  if (bytes.byteLength === 0) return answer({ error: "invalid" }, 400);

  const me = await whoAmI(ctx.orgId, ctx.userId);
  const riderId = me?.rider?.id;
  if (!riderId) return answer({ error: "not_rider" }, 403);
  const params = new URL(request.url).searchParams;
  const asked = params.get("session")?.slice(0, 100) || null;
  const session = asked ? await getSession(ctx, asked) : null;
  if (asked && (!session || session.riderId !== riderId || session.sport !== "bike"))
    return answer({ error: "notFound" }, 404);
  const name = (params.get("name") ?? "")
    .replace(/[\p{Cc}\p{Cf}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  const stored = storedFilesKey(ctx.userId);
  if (!peekRateLimit(stored, STORED_FILES_PER_HOUR).allowed)
    return answer({ error: "rateLimited" }, 429);
  try {
    const imported = await importFit(ctx, riderId, "rulle.fit", bytes, {
      source: "fit",
      title: session?.title ?? (name || undefined),
      sessionId: session?.id,
    });
    rateLimit(stored, STORED_FILES_PER_HOUR, HOUR);
    return answer({ ...imported, duplicate: false }, 201);
  } catch (error) {
    if (error instanceof Refused) {
      if (error.detail === "duplicate") {
        const sha256 = createHash("sha256").update(bytes).digest("hex");
        const earlier = await rideByHash(ctx, riderId, sha256);
        if (earlier) return answer({ ...earlier, duplicate: true }, 200);
      }
      return answer({ error: error.detail ?? error.code }, error.code === "conflict" ? 409 : 400);
    }
    console.error("rulle: saving a ride failed", loggable(error));
    return answer({ error: "generic" }, 500);
  }
}
