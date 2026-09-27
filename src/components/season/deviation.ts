import { ArrowDown, ArrowUp, Equal, type LucideIcon } from "lucide-react";

/**
 * A month's plan against DCU's hours, as a word, a sign and an icon as
 * well as a tint (ADR 0014: a deviation is always shown, never hidden, and
 * never by colour alone). Within half an hour is "as DCU"; October, which
 * DCU keeps as a break, is "DCU plans a break" whenever hours are planned.
 */

export type DeviationKind = "same" | "over" | "under" | "breakOver";

export function deviationKind(planned: number, dcu: number): DeviationKind {
  const diff = planned - dcu;
  if (Math.abs(diff) < 0.5) return "same";
  if (dcu === 0) return "breakOver";
  return diff > 0 ? "over" : "under";
}

export const DEVIATION_STYLE: Record<DeviationKind, { chip: string; icon: LucideIcon }> = {
  same: { chip: "bg-success-tint text-success", icon: Equal },
  over: { chip: "bg-warning-tint text-destructive", icon: ArrowUp },
  under: { chip: "bg-sticky text-sticky-ink", icon: ArrowDown },
  breakOver: { chip: "bg-warning-tint text-destructive", icon: ArrowUp },
};
