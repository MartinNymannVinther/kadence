import { requireOrgContext } from "@/core/auth/guard";
import { getActivityFile } from "@/modules/devices/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The original FIT file behind an activity, for whoever may read the rider's training. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const file = await getActivityFile(ctx, id.slice(0, 100));
  if (!file) return new Response("Not found", { status: 404 });
  const name = file.fileName.replace(/[^\w.-]+/g, "_") || "activity.fit";
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": "application/vnd.ant.fit",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
