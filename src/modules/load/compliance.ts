import type { LoadMethod, Sport } from "./activity-load";
import type { PlanIntensity } from "./plan-intensity";

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
 * **How it felt counts only when it is far off.** A load that came from
 * RPE alone (`method: "rpe"`) is how the session felt, not what was
 * measured, so the colour then reads minutes — unless the felt load is
 * under 50 % or over 200 % of the plan's (`RPE_FAR_LOW_PCT`,
 * `RPE_FAR_HIGH_PCT`), when the feeling says something the minutes do
 * not. Martin, 13 October 2026: "Jeg tror ikke vi skal lægge for meget i
 * hvad folk selv føler ift. feedback. Med mindre det er helt skævt."
 * Strength sessions are RPE by nature (neither watts nor pulse describe a
 * squat), so the same rule makes their colour read minutes unless the
 * feeling is far off. Power and heart rate read load as before. A side
 * with no `method` is read as before too: load wins.
 *
 * **Only a plan that says how hard can be done harder.** A plan that says
 * only how long ("Løbetur 30 min": no steps, or only open ones; see
 * plan-intensity.ts) is judged by minutes, whatever measured the load —
 * its planned load is an estimate from the minutes, so a load against it
 * would call an easy run "twice as hard as planned". And a heart-rate
 * load from another sport than the bike is judged by minutes unless the
 * plan has heart-rate targets: the thresholds are the bike's (ADR 0016),
 * and a run's pulse sits 5–10 beats higher, so its load is overstated
 * against a plan's intensity. The amendment of 14 October to ADR 0095. A
 * planned side with no `intensity` reads as before.
 *
 * Pure: imports nothing from the database.
 */

export type ComplianceColour = "green" | "yellow" | "red" | "grey" | "none";

export interface ComplianceSide {
  minutes: number;
  load?: number | null;
  /** How the done side's load was measured (activities.load_method); "rpe" reads minutes unless far off. */
  method?: LoadMethod | null;
  /** The planned side: what the plan says of how hard (`planIntensityOf`); undefined reads as before. */
  intensity?: PlanIntensity | null;
  /** The done side: the activity's sport; a pulse off the bike is not weighed against a plan's intensity. */
  sport?: Sport | null;
}

function positive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** The whole-percent bands the colour reads; see the file comment. The explanation reads the same ones. */
export const GREEN_LOW_PCT = 80;
export const GREEN_HIGH_PCT = 120;
export const YELLOW_LOW_PCT = 50;
export const YELLOW_HIGH_PCT = 150;

/**
 * A load from RPE alone counts only outside these, in whole percent of the
 * planned load: "helt skævt", in Martin's words of 13 October 2026.
 */
export const RPE_FAR_LOW_PCT = 50;
export const RPE_FAR_HIGH_PCT = 200;

/** Whether a felt load at this whole percent of the plan's is far enough off to count. */
export function feltFarOff(pct: number): boolean {
  return pct < RPE_FAR_LOW_PCT || pct > RPE_FAR_HIGH_PCT;
}

/**
 * What the colour was measured by, and done ÷ planned in whole percent.
 * `timeOnly` when the load could not be compared with this plan at all
 * (`loadOffPlan`): the words then speak of time alone.
 */
export type ComplianceRatio = { by: "load" | "minutes"; pct: number; timeOnly?: true };

/**
 * Whether the done load cannot be weighed against this plan, so only time
 * can: the plan says nothing of how hard, or a pulse off the bike meets a
 * plan without heart-rate targets. See the file comment.
 */
export function loadOffPlan(planned: ComplianceSide, done: ComplianceSide): boolean {
  if (planned.intensity == null) return false;
  if (planned.intensity === "none") return true;
  // The thresholds are the bike's (ADR 0016) and a run's pulse sits higher,
  // so its heart-rate load is compared only with a plan in pulse.
  return (
    done.method === "hr" &&
    done.sport != null &&
    done.sport !== "bike" &&
    planned.intensity !== "pulse"
  );
}

/**
 * The ratio the colour is read from: by load when both sides have one —
 * for a load from RPE alone only when it is far off, never when the load
 * is off the plan's scale (`loadOffPlan`), and either way also when the
 * plan has no minutes to read instead — otherwise by minutes; null when
 * the plan has neither. Exported so the explanation of a colour (deviation.ts)
 * reads the very same number.
 */
export function complianceRatio(
  planned: ComplianceSide,
  done: ComplianceSide,
): ComplianceRatio | null {
  const offPlan = loadOffPlan(planned, done);
  if (positive(planned.load) && typeof done.load === "number" && Number.isFinite(done.load)) {
    const pct = Math.round((done.load / planned.load) * 100);
    const counts = !offPlan && (done.method !== "rpe" || feltFarOff(pct));
    if (counts || !positive(planned.minutes)) return { by: "load", pct };
  }
  if (positive(planned.minutes)) {
    const pct = Math.round((done.minutes / planned.minutes) * 100);
    return offPlan ? { by: "minutes", pct, timeOnly: true } : { by: "minutes", pct };
  }
  return null;
}

/** The colour of a ratio in whole percent. */
export function colourOfPct(pct: number): "green" | "yellow" | "red" {
  if (pct >= GREEN_LOW_PCT && pct <= GREEN_HIGH_PCT) return "green";
  if (pct >= YELLOW_LOW_PCT && pct <= YELLOW_HIGH_PCT) return "yellow";
  return "red";
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
  const ratio = complianceRatio(planned, done);
  return ratio === null ? "green" : colourOfPct(ratio.pct);
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
