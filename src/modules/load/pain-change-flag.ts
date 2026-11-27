import { diffDays } from "@/core/dates";
import type { Flag } from "./guardrails";

/**
 * Sessions moved or skipped for pain or injury, twice or more in a week
 * (docs/adr/0118). A rider who says "Ondt eller skade" once may have had
 * a stiff knee; twice in seven days is something the coach should know of
 * before planning the next week — a warning on the attention list, the
 * same weight as a pain answered on a check-in.
 *
 * Counted by the day the session was on, the last seven days up to today,
 * whoever made the change. Pure: imports nothing from the database.
 */

/** How many changes for pain in a week make it worth the coach's attention. */
export const PAIN_CHANGES_IN_WEEK = 2;

export type PainChange = { fromDate: string; reason: string | null };

export function painChangesFlag(
  changes: readonly PainChange[] | null | undefined,
  todayIso: string,
): Flag | null {
  if (!changes) return null;
  const days = changes
    .filter((c) => c.reason === "pain")
    .map((c) => diffDays(c.fromDate, todayIso))
    .filter((ago) => ago >= 0 && ago < 7);
  if (days.length < PAIN_CHANGES_IN_WEEK) return null;
  return { kind: "changed_for_pain", severity: "warn", values: { count: days.length } };
}
