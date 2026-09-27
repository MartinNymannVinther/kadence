import { CircleAlert, CircleCheck, OctagonAlert, type LucideIcon } from "lucide-react";
import type { WellbeingZone } from "@/modules/load/wellbeing";

/**
 * The check-in's zones drawn the 2a way — a tint with dark ink — and each
 * with an icon of its own shape, so a zone is read by shape and word as
 * well as by colour.
 */
export const ZONE_STYLE: Record<WellbeingZone, { chip: string; icon: LucideIcon }> = {
  green: { chip: "bg-success-tint text-success", icon: CircleCheck },
  yellow: { chip: "bg-sticky text-sticky-ink", icon: CircleAlert },
  red: { chip: "bg-warning-tint text-destructive", icon: OctagonAlert },
};
