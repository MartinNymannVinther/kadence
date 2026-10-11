import { todayInCopenhagen } from "@/core/dates";
import { buildWorkbook, type CellValue, type Sheet } from "@/core/xlsx";
import type { ExportSection, OrgExport } from "./service";

/**
 * The same export in two shapes, built from the same rows.
 *
 * The spreadsheet is for people: one tab per kind of thing, filterable,
 * openable by a board member who has never heard of Kadence. The JSON is
 * for machines: it keeps every id, so the relationships between a
 * session, its ride and the comments on it survive the trip, and it holds
 * the whole audit trail, written a page at a time (stream.ts). Neither is
 * a backup — a backup is a database dump you can restore, and that is a
 * different thing from a copy you can read.
 */

/**
 * A file name that sorts by date and says where it came from, and what it
 * holds when it is not the export itself (`kadence-team-filer-<date>.zip`).
 */
export function exportFileName(
  orgName: string,
  exportedAt: Date,
  extension: string,
  part?: string,
): string {
  const slug =
    orgName
      .toLowerCase()
      .replace(/[æ]/g, "ae")
      .replace(/[ø]/g, "oe")
      .replace(/[å]/g, "aa")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "kadence";
  // The day the file is named for is the day here, not in UTC: an export
  // taken at half past midnight in Copenhagen is not yesterday's.
  const date = todayInCopenhagen(exportedAt);
  return `kadence-${slug}${part ? `-${part}` : ""}-${date}.${extension}`;
}

/**
 * Postgres hands back dates, numbers, booleans, arrays and JSON. A cell can
 * hold a string, a number or a date; everything else is written the way a
 * reader would want to see it rather than the way JavaScript prints it.
 */
function cell(value: unknown): CellValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "ja" : "nej";
  if (typeof value === "bigint") return Number(value);
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  return JSON.stringify(value);
}

/**
 * The workbook: the members, every table, and the newest part of the
 * audit trail (`audit`, read by readNewestAudit). The trail is the only
 * sheet with a cap; the JSON export holds all of it (stream.ts).
 */
export function exportToXlsx(data: OrgExport, audit: ExportSection): Buffer {
  const sheets: Sheet[] = [...data.sections, audit].map((section) => ({
    name: section.sheet,
    // An empty table still gets its tab and its headings, so the file
    // shows what Kadence holds rather than only what happens to be filled in.
    columns:
      section.columns.length > 0
        ? section.columns.map((header) => ({ header }))
        : [{ header: "(ingen rækker)" }],
    rows: section.rows.map((row) => row.map(cell)),
  }));

  return buildWorkbook(sheets);
}
