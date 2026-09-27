import { targetIntensity, zoneForHr, zoneForPower } from "@/modules/load";
import type { Intent, Target, Zone } from "@/modules/workouts/structure";

/**
 * How a step is drawn: its height is the load model's intensity for the
 * target (src/modules/load/planned-load.ts), and its colour the zone that
 * intensity — or the pulse, for a pulse target — falls in. An open step
 * has no zone and is drawn in the neutral tone.
 */

export function zoneOfTarget(target: Target, intent: Intent): Zone | null {
  switch (target.kind) {
    case "zone":
      return target.zone as Zone;
    case "hr_pct":
      return zoneForHr((target.low + target.high) / 2, 100);
    case "open":
      return null;
    default:
      return zoneForPower(targetIntensity(target, intent) * 100, 100);
  }
}

/** Percent of threshold power, for the height of a bar. */
export function drawPct(target: Target, intent: Intent): number {
  return Math.round(targetIntensity(target, intent) * 100);
}

/** The fill for a zone, as a design token. */
export function zoneFill(zone: Zone | null): string {
  return zone === null ? "var(--chart-3)" : `var(--zone-${zone})`;
}
