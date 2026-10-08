import { requireOrgContext } from "@/core/auth/guard";
import { Refused } from "@/core/action";
import { fromAnotherSite } from "@/core/same-site";
import { isImageKind } from "@/modules/team/image-format";
import { getOrgImage, removeOrgImage } from "@/modules/team/images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The club's logo or picture, for anyone in the team (ADR 0048). Its
 * address carries the time of the last change (`?v=`), so the browser may
 * keep it; it is private to the signed-in person and never sniffed as
 * anything but the image type it was checked to be.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const ctx = await requireOrgContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });
  const { kind } = await params;
  if (!isImageKind(kind)) return new Response("Not found", { status: 404 });
  const image = await getOrgImage(ctx, kind);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.mime,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

/** A coach takes the logo or picture away again. */
export async function DELETE(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  if (fromAnotherSite(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  const ctx = await requireOrgContext();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { kind } = await params;
  if (!isImageKind(kind)) return Response.json({ error: "invalid" }, { status: 400 });
  try {
    await removeOrgImage(ctx, kind);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Refused) return Response.json({ error: error.code }, { status: 403 });
    console.error("org image: removal failed", error);
    return Response.json({ error: "generic" }, { status: 500 });
  }
}
