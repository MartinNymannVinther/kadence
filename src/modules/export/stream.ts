import type { OrgContext } from "@/core/db/tenant";
import { readAuditPage, AUDIT_COLUMN_NAMES, type OrgExport } from "./service";
import { AUDIT_SHEET } from "./tables";

/**
 * The JSON export as a stream: the tables first, then the whole audit
 * trail a page at a time (ADR 0084). The response holds one page of the
 * trail in memory, however long the trail has grown, and the next page is
 * read only when the reader has taken the last one.
 *
 * The shape is the one the JSON export has always had (format 1): the
 * tables keyed by their tab name, the trail under "Revisionsspor".
 */

const encoder = new TextEncoder();

function asObject(columns: string[], row: unknown[]): Record<string, unknown> {
  return Object.fromEntries(columns.map((column, index) => [column, row[index] ?? null]));
}

/** Everything up to the opening bracket of the audit trail. */
export function jsonHead(data: OrgExport): string {
  const tables: Record<string, Array<Record<string, unknown>>> = {};
  for (const section of data.sections) {
    tables[section.sheet] = section.rows.map((row) => asObject(section.columns, row));
  }
  // The tables as JSON, without their closing brace, so the trail can
  // follow as one more key.
  const body = JSON.stringify(tables, null, 2).replace(/\n}$/, "");
  const kadence = { format: 1, exportedAt: data.exportedAt.toISOString() };
  return (
    `{\n"kadence": ${JSON.stringify(kadence)},\n` +
    `"organization": ${JSON.stringify(data.organization)},\n` +
    `"tables": ${body},\n  ${JSON.stringify(AUDIT_SHEET)}: [`
  );
}

export function exportJsonStream(ctx: OrgContext, data: OrgExport): ReadableStream<Uint8Array> {
  let headSent = false;
  let afterId = 0;
  let first = true;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!headSent) {
        headSent = true;
        controller.enqueue(encoder.encode(jsonHead(data)));
        return;
      }
      const page = await readAuditPage(ctx, afterId, data.auditUpTo);
      if (page.rows.length === 0) {
        controller.enqueue(encoder.encode("\n  ]\n}\n}\n"));
        controller.close();
        return;
      }
      afterId = page.lastId;
      const lines = page.rows.map((row) => {
        const line = `${first ? "" : ","}\n    ${JSON.stringify(asObject(AUDIT_COLUMN_NAMES, row))}`;
        first = false;
        return line;
      });
      controller.enqueue(encoder.encode(lines.join("")));
    },
  });
}
