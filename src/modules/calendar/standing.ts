import { dcuState, type Volume } from "@/modules/season/volume";

/**
 * How a month's hours on the bike stand against the plan, for the
 * team's season (docs/adr/0093): the season plan's hours when the coach
 * has any — within a tenth, or half an hour, is on plan, as the volume
 * bar says it — otherwise the paradigm's corridor (ADR 0040, 0091). What
 * is weighed is where the month is heading: ridden, plus the sessions
 * still to ride. A month not begun yet has no standing, nor one with
 * nothing to stand against.
 *
 * Pure: imports nothing from the database.
 */

export type Standing = "under" | "on" | "over";

export function standingOf(volume: Volume, month: string, today: string): Standing | null {
  if (`${month}-01` > today) return null;
  const goal = volume.goal;
  if (goal !== null && goal > 0) {
    const off = volume.expected - goal;
    if (Math.abs(off) <= Math.max(0.5, goal * 0.1)) return "on";
    return off > 0 ? "over" : "under";
  }
  const state = dcuState(volume);
  return state === null ? null : state === "inside" ? "on" : state;
}
