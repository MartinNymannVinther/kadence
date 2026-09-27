import { requireOrgContext } from "@/core/auth/guard";
import { Refused } from "@/core/action";
import { rateLimit } from "@/core/rate-limit";
import { importFit, MAX_UPLOAD_BYTES } from "@/modules/devices/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A rider's (or a coach's) FIT file upload: multipart form data with
 * `riderId` and one or more `file`s. A route rather than a server action,
 * because a ride can be larger than an action's body limit. Each file is
 * answered on its own — imported, a duplicate, or refused with the
 * decoder's reason — so one bad file does not sink the others.
 */
export async function POST(request: Request) {
  const ctx = await requireOrgContext();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });
  const limit = rateLimit(`upload:${ctx.userId}`, 60, 60 * 60 * 1000);
  if (!limit.allowed) return Response.json({ error: "rateLimited" }, { status: 429 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES * 5) return Response.json({ error: "too_large" }, { status: 413 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const riderId = String(form.get("riderId") ?? "");
  const files = form
    .getAll("file")
    .filter((f): f is File => f instanceof File)
    .slice(0, 5);
  if (!riderId || riderId.length > 100 || files.length === 0)
    return Response.json({ error: "invalid" }, { status: 400 });

  const results = [];
  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      results.push({ name: file.name, ok: false, error: "too_large" });
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
