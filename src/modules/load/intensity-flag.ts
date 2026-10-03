import type { Flag } from "./guardrails";
import { counted, type IntensityCount } from "./intensity";

/**
 * The profile's one guardrail (docs/adr/0053): over the last four weeks
 * of the plan, the middle zone has grown well past the profile's ceiling.
 * Worth knowing, never a ban — the coach may have a reason, and races
 * late in a phase pull the numbers about.
 *
 * Pure: imports nothing from the database.
 */

/** The weeks looked at: this one and the three before. */
export const MID_ZONE_WEEKS = 4;
/** Fewer counted sessions than this, two a week, and a share says little. */
export const MID_ZONE_MIN_SESSIONS = 8;
/** Points above the ceiling before it is named: the same five the profile's 75–80 % floor spans. */
export const MID_ZONE_GIVE = 5;

export type MidZoneInput = { count: IntensityCount; midMax: number };

export function midZoneFlag(input: MidZoneInput | null | undefined): Flag | null {
  if (!input) return null;
  const sessions = counted(input.count);
  if (sessions < MID_ZONE_MIN_SESSIONS) return null;
  const mid = Math.round((100 * input.count.mid) / sessions);
  if (mid <= input.midMax + MID_ZONE_GIVE) return null;
  return { kind: "mid_zone", severity: "info", values: { mid, sessions, limit: input.midMax } };
}
