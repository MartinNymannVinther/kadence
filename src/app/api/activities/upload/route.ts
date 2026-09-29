import { requireOrgContext } from "@/core/auth/guard";
import { Refused } from "@/core/action";
import { peekRateLimit, rateLimit } from "@/core/rate-limit";
import { fromAnotherSite } from "@/core/same-site";
import type { OrgContext } from "@/core/db/tenant";
import { DeviceHttpError, loggable } from "@/modules/devices/http";
import { importFit, MAX_UPLOAD_BYTES } from "@/modules/devices/import";
import { BUSY_SECONDS, signedInReads } from "@/modules/devices/in-flight";
import { STORED_FILES_PER_HOUR, storedFilesKey } from "@/modules/devices/ingest";
import { readWithin, storedName } from "@/modules/devices/ingest-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A rider's (or a coach's) FIT file upload: multipart form data with
 * `riderId` and up to three `file`s. A route rather than a server action,
 * because a ride can be larger than an action's body limit. Each file is
 * answered on its own — imported, a duplicate, or refused with the
 * decoder's reason — so one bad file does not sink the others. Requests
 * are counted as they come; files are counted when they are kept, so a
 * ride that is already here never uses the hour up (ADR 0019, 0029). At
 * most two bodies are read for a person at once, each within a minute,
 * whichever of the signed-in doors they come by (src/modules/devices/in-flight.ts).
 */
const MAX_FILES = 3;
/** The whole request, files and form overhead: counted as it arrives, not trusted from a header. */
const MAX_BODY_BYTES = MAX_UPLOAD_BYTES * MAX_FILES + 64 * 1024;
const HOUR = 60 * 60 * 1000;

export async function POST(request: Request) {
  if (fromAnotherSite(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  const ctx = await requireOrgContext();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });
  const limit = rateLimit(`upload:${ctx.userId}`, 30, HOUR);
  if (!limit.allowed) return Response.json({ error: "rateLimited" }, { status: 429 });

  if (!signedInReads.enter(ctx.userId))
    return Response.json(
      { error: "busy" },
      { status: 429, headers: { "Retry-After": String(BUSY_SECONDS) } },
    );
  try {
    return await keep(request, ctx);
  } finally {
    signedInReads.leave(ctx.userId);
  }
}

async function keep(request: Request, ctx: OrgContext): Promise<Response> {
  let form: FormData;
  try {
    // Counted as it arrives, not trusted from a header, and given up at the deadline.
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
    if (code === "too_large") return Response.json({ error: "too_large" }, { status: 413 });
    if (code === "timeout") return Response.json({ error: "timeout" }, { status: 408 });
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const riderId = String(form.get("riderId") ?? "");
  const files = form
    .getAll("file")
    .filter((f): f is File => f instanceof File)
    .slice(0, MAX_FILES);
  if (!riderId || riderId.length > 100 || files.length === 0)
    return Response.json({ error: "invalid" }, { status: 400 });

  const results = [];
  for (const file of files) {
    // A browser that was handed a folder sends the file under its path.
    const name = file.name.split(/[\\/]/).pop() || file.name;
    if (file.size > MAX_UPLOAD_BYTES) {
      results.push({ name, ok: false, error: "too_large" });
      continue;
    }
    // Stored files count, not tries: at most sixty an hour per person,
    // whichever door they come in by.
    const stored = storedFilesKey(ctx.userId);
    if (!peekRateLimit(stored, STORED_FILES_PER_HOUR).allowed) {
      results.push({ name, ok: false, error: "rateLimited" });
      continue;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const kept = storedName(name, bytes);
      const imported = await importFit(ctx, riderId, kept.name, bytes, {
        source: "fit",
        unnamed: !kept.own,
      });
      rateLimit(stored, STORED_FILES_PER_HOUR, HOUR);
      results.push({ name, ok: true, ...imported });
    } catch (error) {
      if (error instanceof Refused)
        results.push({ name, ok: false, error: error.detail ?? error.code });
      else {
        console.error("upload: import failed", loggable(error));
        results.push({ name, ok: false, error: "generic" });
      }
    }
  }
  return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
