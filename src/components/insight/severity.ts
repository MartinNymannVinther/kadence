import { CircleAlert, Info, OctagonAlert, type LucideIcon } from "lucide-react";
import type { Severity } from "@/modules/load";

/**
 * How much a flag matters, drawn the 2a way: a tint with dark ink, and an
 * icon of its own shape for each level, so severity never rests on colour.
 */
export const SEVERITY_STYLE: Record<Severity, { chip: string; icon: LucideIcon }> = {
  alert: { chip: "bg-warning-tint text-destructive", icon: OctagonAlert },
  warn: { chip: "bg-sticky text-sticky-ink", icon: CircleAlert },
  info: { chip: "bg-muted text-meta", icon: Info },
};
