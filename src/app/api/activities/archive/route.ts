import { requireOrgContext } from "@/core/auth/guard";
import { Refused } from "@/core/action";
import { rateLimit } from "@/core/rate-limit";
import { fromAnotherSite } from "@/core/same-site";
import {
  ARCHIVE_FILES_PER_REQUEST,
  ARCHIVE_REQUESTS_PER_DAY,
  DAY,
  keepArchiveFiles,
  type ArchiveFile,
} from "@/modules/devices/archive";
import { DeviceHttpError, loggable, readLimited } from "@/modules/devices/http";
import { MAX_UPLOAD_BYTES } from "@/modules/devices/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The files and the form around them, counted as they arrive. */
const MAX_BODY_BYTES = MAX_UPLOAD_BYTES * ARCHIVE_FILES_PER_REQUEST + 64 * 1024;

const refuse = (error: string, status: number, retryAfterSeconds = 0) =>
  Response.json(
    { error, ...(retryAfterSeconds ? { retryAfterSeconds } : {}) },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {}),
      },
    },
  );

/**
 * A few rides from a rider's Strava archive (ADR 0030): multipart form
 * data with `riderId`, `only` ("bike" or "all") and up to three `file`s,
 * each followed by its `title`, the name from the archive's list. Stands
 * on the session like the upload, refuses another site's pages like it,
 * and answers each file on its own; the day's budget is the archive's
 * own (src/modules/devices/archive.ts). The browser reads the archive and
 * sends only the rides Kadence does not have
 * (src/components/activities/import-archive.ts).
 */
export async function POST(request: Request) {
  if (fromAnotherSite(request)) return refuse("forbidden", 403);
  const ctx = await requireOrgContext();
  if (!ctx) return refuse("unauthorized", 401);
  const asked = rateLimit(`archive:${ctx.userId}`, ARCHIVE_REQUESTS_PER_DAY, DAY);
  if (!asked.allowed) return refuse("rateLimited", 429, asked.retryAfterSeconds);

  let form: FormData;
  try {
    const body = await readLimited(
      request.body,
      MAX_BODY_BYTES,
      request.headers.get("content-length"),
    );
    form = await new Response(new Blob([body as Uint8Array<ArrayBuffer>]), {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch (error) {
    const tooLarge = error instanceof DeviceHttpError && error.code === "too_large";
    return refuse(tooLarge ? "too_large" : "invalid", tooLarge ? 413 : 400);
  }

  const riderId = String(form.get("riderId") ?? "");
  const only = String(form.get("only") ?? "bike");
  const parts = form.getAll("file").filter((f): f is File => f instanceof File);
  const titles = form.getAll("title").map((t) => (typeof t === "string" ? t.slice(0, 500) : ""));
  if (
    !riderId ||
    riderId.length > 100 ||
    (only !== "bike" && only !== "all") ||
    parts.length === 0 ||
    parts.length > ARCHIVE_FILES_PER_REQUEST
  )
    return refuse("invalid", 400);

  const files: ArchiveFile[] = await Promise.all(
    parts.map(async (part, i) => ({
      name: part.name,
      title: titles[i] ?? "",
      bytes: part.size > MAX_UPLOAD_BYTES ? null : new Uint8Array(await part.arrayBuffer()),
    })),
  );
  try {
    const answer = await keepArchiveFiles(ctx, riderId, files, only === "bike");
    return Response.json(answer, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Refused) return refuse(error.code, error.code === "notFound" ? 404 : 403);
    console.error("archive: failed", loggable(error));
    return refuse("generic", 500);
  }
}
