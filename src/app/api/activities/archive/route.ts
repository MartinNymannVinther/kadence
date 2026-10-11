import { requireOrgContext } from "@/core/auth/guard";
import { Refused } from "@/core/action";
import type { OrgContext } from "@/core/db/tenant";
import { rateLimit } from "@/core/rate-limit";
import { fromAnotherSite } from "@/core/same-site";
import {
  ARCHIVE_FILES_PER_REQUEST,
  ARCHIVE_REQUESTS_PER_DAY,
  ARCHIVE_REQUESTS_PER_MINUTE,
  archiveMinuteKey,
  archiveRequestsKey,
  DAY,
  keepArchiveFiles,
  MINUTE,
  requireArchiveWriter,
  type ArchiveFile,
} from "@/modules/devices/archive";
import { DeviceHttpError, loggable } from "@/modules/devices/http";
import { MAX_UPLOAD_BYTES } from "@/modules/devices/import";
import { BUSY_SECONDS, signedInReads } from "@/modules/devices/in-flight";
import { readWithin } from "@/modules/devices/ingest-request";

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

const kindOf = (value: FormDataEntryValue | undefined) =>
  value === "bike" || value === "other" ? value : undefined;

/**
 * A few rides from a rider's Strava archive (ADR 0030): multipart form
 * data with up to three `file`s, each followed by its `title`, the name
 * from the archive's list, and its `kind`, the list's word for what it
 * was; the rider and whether only rides are kept are in the address,
 * `?riderId=…&only=bike|all`, so that who may write for the rider is
 * asked before a byte of the body is read. Stands on the session like the
 * upload, refuses another site's pages like it, reads at most two bodies
 * for a person at once and each within a minute, and answers each file on
 * its own. The budgets are the archive's own (src/modules/devices/archive.ts):
 * the day's, and a minute's that the browser keeps to
 * (src/components/activities/import-archive.ts), which sends only the
 * rides Kadence does not have.
 */
export async function POST(request: Request) {
  if (fromAnotherSite(request)) return refuse("forbidden", 403);
  const ctx = await requireOrgContext();
  if (!ctx) return refuse("unauthorized", 401);
  const asked = await rateLimit(archiveRequestsKey(ctx.userId), ARCHIVE_REQUESTS_PER_DAY, DAY);
  if (!asked.allowed) return refuse("rateLimited", 429, asked.retryAfterSeconds);
  const minute = await rateLimit(archiveMinuteKey(ctx.userId), ARCHIVE_REQUESTS_PER_MINUTE, MINUTE);
  if (!minute.allowed) return refuse("busy", 429, minute.retryAfterSeconds);

  const params = new URL(request.url).searchParams;
  const riderId = params.get("riderId") ?? "";
  const only = params.get("only") ?? "bike";
  if (!riderId || riderId.length > 100 || (only !== "bike" && only !== "all"))
    return refuse("invalid", 400);
  try {
    await requireArchiveWriter(ctx, riderId);
  } catch (error) {
    if (error instanceof Refused) return refuse(error.code, error.code === "notFound" ? 404 : 403);
    console.error("archive: failed", loggable(error));
    return refuse("generic", 500);
  }

  if (!(await signedInReads.enter(ctx.userId))) return refuse("busy", 429, BUSY_SECONDS);
  try {
    return await keep(request, ctx, riderId, only === "bike");
  } finally {
    await signedInReads.leave(ctx.userId);
  }
}

async function keep(
  request: Request,
  ctx: OrgContext,
  riderId: string,
  onlyBike: boolean,
): Promise<Response> {
  let form: FormData;
  try {
    const body = await readWithin(
      request.body,
      MAX_BODY_BYTES,
      request.headers.get("content-length"),
    );
    form = await new Response(new Blob([body as Uint8Array<ArrayBuffer>]), {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch (error) {
    const code = error instanceof DeviceHttpError ? error.code : "invalid";
    if (code === "too_large") return refuse("too_large", 413);
    if (code === "timeout") return refuse("timeout", 408);
    return refuse("invalid", 400);
  }

  const parts = form.getAll("file").filter((f): f is File => f instanceof File);
  const titles = form.getAll("title").map((t) => (typeof t === "string" ? t.slice(0, 500) : ""));
  const kinds = form.getAll("kind");
  if (parts.length === 0 || parts.length > ARCHIVE_FILES_PER_REQUEST) return refuse("invalid", 400);

  const files: ArchiveFile[] = await Promise.all(
    parts.map(async (part, i) => ({
      name: part.name,
      title: titles[i] ?? "",
      kind: kindOf(kinds[i]),
      bytes: part.size > MAX_UPLOAD_BYTES ? null : new Uint8Array(await part.arrayBuffer()),
    })),
  );
  try {
    const answer = await keepArchiveFiles(ctx, riderId, files, onlyBike);
    return Response.json(answer, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Refused) return refuse(error.code, error.code === "notFound" ? 404 : 403);
    console.error("archive: failed", loggable(error));
    return refuse("generic", 500);
  }
}
