import { calendarHref } from "@/components/calendar/href";
import type { FlagKind, Severity } from "@/modules/load";
import type { RiderInsight } from "@/modules/insight/rider";

/**
 * The team's week as the place for signals (ADR 0062): each rider's open
 * flags as small badges beside their name, each badge a way down to the
 * rider's entry in the attention list under the grid, and every flag a
 * way to the rider's calendar for the week it is about. Pure, so the
 * mapping is tested without React.
 */

/** The attention list's anchor; Today links to `/calendar#opmaerksomhed`. */
export const ATTENTION_ID = "opmaerksomhed";

/** Badges beside a name before the rest are counted: a row stays a row. */
export const BADGES_SHOWN = 3;

/** One rider's entry in the list, the place a badge leads to. */
export const attentionAnchor = (riderId: string) => `${ATTENTION_ID}-${riderId}`;

/** `ref`, when set, names a senior's profile the flag's numbers are (docs/adr/0091); else DCU's. */
export type SignalBadge = { kind: FlagKind; severity: Severity; ref?: string };

export type RiderSignals = {
  /** The most serious kinds first, one badge per kind. */
  badges: SignalBadge[];
  /** Kinds beyond the badges shown, said as "+2". */
  more: number;
  /** `#opmaerksomhed-<rider>`: the rider's entry in the list below. */
  anchor: string;
};

/** The rider's own calendar for the week a flag is about. */
export function flagWeekHref(insight: { riderId: string; week: { monday: string } }): string {
  return calendarHref({ week: insight.week.monday, rider: insight.riderId });
}

/**
 * A rider's open flags as badges: one per kind (two strength pairs are one
 * badge), in the guardrails' order — the most serious first — and at most
 * `shown` of them, the rest counted. Null for a rider with nothing open.
 */
export function riderSignals(
  insight: Pick<RiderInsight, "riderId" | "flags">,
  shown = BADGES_SHOWN,
): RiderSignals | null {
  const badges: SignalBadge[] = [];
  for (const flag of insight.flags)
    if (!badges.some((b) => b.kind === flag.kind))
      badges.push({
        kind: flag.kind,
        severity: flag.severity,
        ...(typeof flag.values.ref === "string" ? { ref: flag.values.ref } : {}),
      });
  if (badges.length === 0) return null;
  return {
    badges: badges.slice(0, shown),
    more: Math.max(0, badges.length - shown),
    anchor: `#${attentionAnchor(insight.riderId)}`,
  };
}

/** Every rider's signals by id, for the grid and the phone's cards. */
export function teamSignals(
  insights: readonly Pick<RiderInsight, "riderId" | "flags">[],
  shown = BADGES_SHOWN,
): Record<string, RiderSignals> {
  const out: Record<string, RiderSignals> = {};
  for (const insight of insights) {
    const signals = riderSignals(insight, shown);
    if (signals) out[insight.riderId] = signals;
  }
  return out;
}
