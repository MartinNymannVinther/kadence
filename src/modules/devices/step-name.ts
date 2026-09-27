import type { Step } from "@/modules/workouts/structure";

/**
 * The name a step carries on a head unit: the coach's own label when the
 * step has one, otherwise what it asks for in the terms every cyclist
 * reads the same in Danish and English — "Z4", "91-105% FTP", "85-90% HR",
 * "RPE 7". A device that cannot hold the target itself (no FTP known, say)
 * still shows the rider what the step is. Pure.
 */
export function stepName(step: Step): string {
  const label = step.label?.trim();
  if (label) return label.slice(0, 60);
  const t = step.target;
  switch (t.kind) {
    case "zone":
      return `Z${t.zone}`;
    case "ftp_pct":
      return `${Math.min(t.low, t.high)}-${Math.max(t.low, t.high)}% FTP`;
    case "hr_pct":
      return `${Math.min(t.low, t.high)}-${Math.max(t.low, t.high)}% HR`;
    case "rpe":
      return `RPE ${t.value}`;
    case "open":
      return "";
  }
}

/** A usable threshold: a positive, finite number, or null. */
export function usable(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}
