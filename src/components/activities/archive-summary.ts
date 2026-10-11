import type { ArchiveProgress } from "./import-archive";

/**
 * What a finished run says, as message keys and their values: a line for
 * each thing that happened, and, when the run stopped early, why and how
 * many are left. "There were no new rides" is said only of a run that
 * went through the whole archive: a run stopped before its first ride
 * came in says only that it stopped, never that there was nothing.
 */

export type SummaryLine =
  | { key: "imported" | "known" | "skipped" | "unreadableFiles"; values: { count: number } }
  | { key: "nothing"; values?: undefined };

export type SummaryOutcome =
  | { key: "limit"; values: { count: number; hours: number } }
  | { key: "quota" | "failed" | "cancelled"; values: { count: number } }
  | { key: "signedOut"; values?: undefined };

export type Summary = { lines: SummaryLine[]; outcome: SummaryOutcome | null };

export function summarise(progress: ArchiveProgress): Summary {
  const counted: SummaryLine[] = [];
  const add = (key: "imported" | "known" | "skipped" | "unreadableFiles", count: number) => {
    if (count > 0) counted.push({ key, values: { count } });
  };
  add("imported", progress.imported);
  add("known", progress.known);
  add("skipped", progress.skipped);
  add("unreadableFiles", progress.unreadable);

  const count = progress.left;
  let outcome: SummaryOutcome | null = null;
  if (progress.outcome === "limit")
    outcome = {
      key: "limit",
      values: { count, hours: Math.max(1, Math.ceil(progress.retryAfterSeconds / 3600)) },
    };
  else if (progress.outcome === "quota") outcome = { key: "quota", values: { count } };
  else if (progress.outcome === "signedOut") outcome = { key: "signedOut" };
  else if (progress.outcome === "failed" || progress.outcome === "cancelled")
    outcome = { key: progress.outcome, values: { count } };

  const lines: SummaryLine[] =
    counted.length === 0 && progress.outcome === "done" ? [{ key: "nothing" }] : counted;
  return { lines, outcome };
}
