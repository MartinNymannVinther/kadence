import { requireOrgContext } from "@/core/auth/guard";
import { Refused } from "@/core/action";
import { rateLimit } from "@/core/rate-limit";
import { importFit, MAX_UPLOAD_BYTES } from "@/modules/devices/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A rider's (or a coach's) FIT file upload: multipart form data with
 * `riderId` and up to three `file`s. A route rather than a server action,
 * because a ride can be larger than an action's body limit. Each file is
 * answered on its own — imported, a duplicate, or refused with the
 * decoder's reason — so one bad file does not sink the others.
 */
const MAX_FILES = 3;
/** The whole request, files and form overhead: counted as it arrives, not trusted from a header. */
const MAX_BODY_BYTES = MAX_UPLOAD_BYTES * MAX_FILES + 64 * 1024;
const HOUR = 60 * 60 * 1000;

/** The body, read until it passes the cap — a chunked upload has no length to trust. */
async function readCapped(request: Request, max: number): Promise<Uint8Array | null> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function POST(request: Request) {
  const ctx = await requireOrgContext();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });
  const limit = rateLimit(`upload:${ctx.userId}`, 30, HOUR);
  if (!limit.allowed) return Response.json({ error: "rateLimited" }, { status: 429 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return Response.json({ error: "too_large" }, { status: 413 });
  const body = await readCapped(request, MAX_BODY_BYTES);
  if (!body) return Response.json({ error: "too_large" }, { status: 413 });

  let form: FormData;
  try {
    form = await new Response(new Blob([body as Uint8Array<ArrayBuffer>]), {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
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
    if (file.size > MAX_UPLOAD_BYTES) {
      results.push({ name: file.name, ok: false, error: "too_large" });
      continue;
    }
    // Stored files count, not requests: at most 60 an hour per person.
    if (!rateLimit(`upload-files:${ctx.userId}`, 60, HOUR).allowed) {
      results.push({ name: file.name, ok: false, error: "rateLimited" });
      continue;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const imported = await importFit(ctx, riderId, file.name, bytes);
      results.push({ name: file.name, ok: true, ...imported });
    } catch (error) {
      if (error instanceof Refused)
        results.push({ name: file.name, ok: false, error: error.detail ?? error.code });
      else {
        console.error("upload: import failed", error);
        results.push({ name: file.name, ok: false, error: "generic" });
      }
    }
  }
  return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
