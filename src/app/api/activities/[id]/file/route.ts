import { requireOrgContext } from "@/core/auth/guard";
import { getActivityFile } from "@/modules/devices/import";

/** The original's media type, by the ending it was stored with. */
const TYPES: Record<string, string> = {
  fit: "application/vnd.ant.fit",
  tcx: "application/vnd.garmin.tcx+xml",
  gpx: "application/gpx+xml",
  gz: "application/gzip",
  zip: "application/zip",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The original file behind an activity, in the format it came in, for whoever may read the rider's training. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const file = await getActivityFile(ctx, id.slice(0, 100));
  if (!file) return new Response("Not found", { status: 404 });
  const name = file.fileName.replace(/[^\w.-]+/g, "_") || "activity.fit";
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type":
        TYPES[/\.(\w+)$/.exec(name)?.[1]?.toLowerCase() ?? ""] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
