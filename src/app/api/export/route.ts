import type { NextRequest } from "next/server";
import { requireOrgContext } from "@/core/auth/guard";
import { exportFileName, exportToXlsx } from "@/modules/export/format";
import { exportRateLimit, limitedResponse } from "@/modules/export/limits";
import { buildOrgExport, readNewestAudit } from "@/modules/export/service";
import { exportJsonStream } from "@/modules/export/stream";
import { AUDIT_SHEET_ROWS } from "@/modules/export/tables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Everything this organization holds, as one file.
 *
 * Behind the ordinary session guard and the ordinary org context, so it can
 * only ever hand out the data of the organization the caller is signed in
 * to. The response is marked no-store: a full export is the last thing that
 * should sit in a shared cache. Three a workspace an hour (ADR 0088).
 *
 * The spreadsheet is built whole and holds the newest AUDIT_SHEET_ROWS of
 * the audit trail; the JSON is streamed and holds all of it, read a page
 * at a time.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireOrgContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const params = request.nextUrl.searchParams;
  const limit = exportRateLimit("export", ctx.orgId);
  if (!limit.allowed) return limitedResponse("export", limit, params.get("locale"));

  const wantsJson = params.get("format") === "json";
  const data = await buildOrgExport(ctx, wantsJson ? "json" : "xlsx");
  const name = data.organization?.name ?? "kadence";

  if (wantsJson) {
    return new Response(exportJsonStream(ctx, data), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFileName(name, data.exportedAt, "json")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const audit = await readNewestAudit(ctx, data.auditUpTo, AUDIT_SHEET_ROWS);
  const workbook = exportToXlsx(data, audit);
  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${exportFileName(name, data.exportedAt, "xlsx")}"`,
      "Cache-Control": "no-store",
    },
  });
}
