import type { CheckinRow } from "@/core/db/schema";
import type { CheckinValues } from "./checkin-card";

/** A stored check-in, trimmed to what the card edits before it crosses to the browser. */
export function checkinValues(row: CheckinRow | null): CheckinValues | null {
  if (!row) return null;
  return {
    sleepHours: row.sleepHours,
    sleepQuality: row.sleepQuality,
    energy: row.energy,
    mood: row.mood,
    soreness: row.soreness,
    stress: row.stress,
    pain: row.pain,
    painWhere: row.painWhere,
    usualPains: row.usualPains,
    ill: row.ill,
    note: row.note,
  };
}
