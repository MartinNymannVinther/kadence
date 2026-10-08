import { requireOrgContext } from "@/core/auth/guard";
import { Refused } from "@/core/action";
import { rateLimit } from "@/core/rate-limit";
import { fromAnotherSite } from "@/core/same-site";
import { DeviceHttpError } from "@/modules/devices/http";
import { readWithin } from "@/modules/devices/ingest-request";
import { IMAGE_LIMITS, isImageKind } from "@/modules/team/image-format";
import { saveOrgImage } from "@/modules/team/images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The body: the file at its largest, plus the form's own overhead. */
const MAX_BODY_BYTES = IMAGE_LIMITS.cover.bytes + 64 * 1024;
const HOUR = 60 * 60 * 1000;

/**
 * A coach uploads the club's logo or picture (ADR 0048): multipart form
 * data with `kind` and one `file`. A route rather than a server action,
 * because a picture can be larger than an action's body limit. The bytes
 * are counted as they arrive and checked for what they are; the service
 * refuses anyone who is not a coach, and so does the database.
 */
export async function POST(request: Request) {
  if (fromAnotherSite(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  const ctx = await requireOrgContext();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`org-image:${ctx.userId}`, 30, HOUR).allowed)
    return Response.json({ error: "rateLimited" }, { status: 429 });

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
    if (code === "too_large") return Response.json({ error: "tooLarge" }, { status: 413 });
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const kind = String(form.get("kind") ?? "");
  const file = form.get("file");
  if (!isImageKind(kind) || !(file instanceof File))
    return Response.json({ error: "invalid" }, { status: 400 });

  try {
    await saveOrgImage(ctx, kind, new Uint8Array(await file.arrayBuffer()));
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Refused) {
      const status = error.code === "forbidden" ? 403 : 400;
      return Response.json({ error: error.detail ?? error.code }, { status });
    }
    console.error("org image: upload failed", error);
    return Response.json({ error: "generic" }, { status: 500 });
  }
}
