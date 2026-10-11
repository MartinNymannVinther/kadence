import { rateLimit, type RateLimit } from "@/core/rate-limit";

/**
 * How often a workspace may take its data out (ADR 0084). Generous for a
 * person, and a ceiling for a script or a stuck button: every export
 * reads the whole workspace, and the files can be gigabytes. Counted per
 * workspace, not per person, because the work is the workspace's.
 */

const HOUR = 60 * 60 * 1000;

export const EXPORT_LIMITS = {
  /** The spreadsheet and the JSON, together. */
  export: 3,
  /** "Hent dine filer". */
  files: 2,
} as const;

export type ExportKind = keyof typeof EXPORT_LIMITS;

export function exportRateLimit(kind: ExportKind, orgId: string): Promise<RateLimit> {
  const key = kind === "export" ? `export:${orgId}` : `export-files:${orgId}`;
  return rateLimit(key, EXPORT_LIMITS[kind], HOUR);
}

/**
 * Back to Settings → Data, which says plainly that the limit is reached
 * and when it lifts. A redirect rather than an error body, because the
 * button is a plain link: the browser shows the page, not a download
 * that holds an error message.
 */
export function limitedResponse(
  kind: ExportKind,
  limit: RateLimit,
  locale: string | null,
): Response {
  const prefix = locale === "en" ? "/en" : "";
  const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${prefix}/settings/data?limited=${kind}&minutes=${minutes}`,
      "Retry-After": String(limit.retryAfterSeconds),
      "Cache-Control": "no-store",
    },
  });
}
