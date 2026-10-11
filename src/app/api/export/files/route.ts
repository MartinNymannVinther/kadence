import type { NextRequest } from "next/server";
import { requireOrgContext } from "@/core/auth/guard";
import { filesZipStream, listExportFiles } from "@/modules/export/files";
import { exportFileName } from "@/modules/export/format";
import { exportRateLimit, limitedResponse } from "@/modules/export/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Hent dine filer": every ride's original file the caller may read, as a
 * ZIP with a folder per rider, streamed a few files at a time (ADR 0084).
 * Two a workspace an hour.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireOrgContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const limit = await exportRateLimit("files", ctx.orgId);
  if (!limit.allowed) {
    return limitedResponse("files", limit, request.nextUrl.searchParams.get("locale"));
  }

  const { organizationName, files } = await listExportFiles(ctx);
  const name = exportFileName(organizationName, new Date(), "zip", "filer");
  return new Response(filesZipStream(ctx, files), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
