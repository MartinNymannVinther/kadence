import type { Sport } from "./activity-load";

/**
 * How what was done compares to what was planned: the calendar's colours,
 * and which planned session an uploaded ride belongs to.
 *
 * The colour reads the ratio done ÷ planned in whole percent — by load
 * when both sides have one (a planned session estimated by
 * `planned-load.ts`, an activity by `activity-load.ts`), since load says
 * how hard as well as how long; otherwise by minutes:
 *
 * - **green**: 80–120 % — done as planned;
 * - **yellow**: 50–79 % or 121–150 % — noticeably less or more;
 * - **red**: under 50 % or over 150 %, or a planned session on a day that
 *   has passed with nothing done;
 * - **grey**: planned, not done yet, and the day is today or later —
 *   today is not missed until it is over;
 * - **none**: an activity nobody planned; the calendar shows it neutral,
 *   because riding without a plan is not a failure.
 *
 * A planned session with neither minutes nor load is green once anything
 * is done — there was nothing to measure against.
 *
 * Pure: imports nothing from the database.
 */

export type ComplianceColour = "green" | "yellow" | "red" | "grey" | "none";

export interface ComplianceSide {
  minutes: number;
  load?: number | null;
}

function positive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function ratioPct(planned: ComplianceSide, done: ComplianceSide): number | null {
  if (positive(planned.load) && typeof done.load === "number" && Number.isFinite(done.load))
    return Math.round((done.load / planned.load) * 100);
  if (positive(planned.minutes)) return Math.round((done.minutes / planned.minutes) * 100);
  return null;
}

/** The colour of a day's planned session against what was done; see the file comment. */
export function compliance(
  planned: ComplianceSide | null,
  done: ComplianceSide | null,
  dayIso: string,
  todayIso: string,
): ComplianceColour {
  if (!planned) return "none";
  if (!done) return dayIso < todayIso ? "red" : "grey";
  const pct = ratioPct(planned, done);
  if (pct === null) return "green";
  if (pct >= 80 && pct <= 120) return "green";
  if (pct >= 50 && pct <= 150) return "yellow";
  return "red";
}

export interface MatchCandidate {
  id: string;
  sport: Sport;
  onDate: string;
  minutes: number;
  activityId: string | null;
}

/**
 * The planned session an activity was the doing of: the same day, the
 * same sport, not already matched, and of those the one whose planned
 * minutes are closest to the activity's. On a tie the first in the list
 * wins, so pass sessions in the day's order. Null when none fits — the
 * activity then stands on its own as unplanned.
 */
export function matchActivity(
  activity: { sport: Sport; onDate: string; minutes: number },
  sessions: readonly MatchCandidate[],
): string | null {
  let best: MatchCandidate | null = null;
  let bestGap = Infinity;
  for (const session of sessions) {
    if (session.activityId !== null) continue;
    if (session.sport !== activity.sport || session.onDate !== activity.onDate) continue;
    const gap = Math.abs(session.minutes - activity.minutes);
    if (gap < bestGap) {
      best = session;
      bestGap = gap;
    }
  }
  return best?.id ?? null;
}
