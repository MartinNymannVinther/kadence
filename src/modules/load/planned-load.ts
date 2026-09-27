import {
  ZONES,
  ZONE_FTP_PCT,
  ZONE_FTP_RIDE,
  ZONE_HR_PCT,
  flattenSteps,
  type Intent,
  type Structure,
  type Target,
  type Zone,
} from "@/modules/workouts/structure";
import { loadAt, rpeIntensity, rpeLoad } from "./calibration";

/**
 * The load a planned session should come to, estimated from its
 * structure before it is ridden — for the week's planned load against
 * what was done, and for the calendar's colours when both have a load.
 * It needs no thresholds: every target is read as a share of threshold.
 *
 * A bike session is the sum of its steps, each hours × intensity² × 100
 * (`calibration.ts`), with the intensity read from the step's target:
 *
 * - **zone**: the midpoint of the zone's band of FTP. Zone 1's band starts
 *   at 0 %, which is the table's floor rather than anything a rider
 *   pedals at, so its midpoint is taken over 40–55 % (0.475), a recovery
 *   spin. Zone 7's midpoint, about 200 %, is a sprint's.
 * - **ftp_pct**: the midpoint of the range.
 * - **hr_pct**: the midpoint of the range, moved onto the power scale
 *   zone by zone — a pulse a third of the way through a heart-rate zone
 *   reads as a third of the way through the same zone's power band. The
 *   two tables are drawn from different traditions and do not line up
 *   exactly (threshold heart rate sits at the start of zone 5, threshold
 *   power in the middle of zone 4), so this is rough by design.
 * - **rpe**: the RPE calibration's intensity, (RPE / 8)^0.9.
 * - **open**: 0.65 for warm-up, cool-down and steady riding (easy
 *   endurance, the low end of what a rider does unprompted), 0.5 for a
 *   recovery between efforts, and 1.0 for work — an open work step is
 *   usually "all out" or "race it", and threshold is the honest middle.
 *
 * A strength session is its minutes at RPE 6 and anything else its
 * minutes at RPE 5, the typical effort of each when nothing more is known.
 *
 * Pure: imports nothing from the database.
 */

/** Where zone 1 starts in practice, in percent of FTP. */
const RIDING_FLOOR_PCT = 40;

export const OPEN_INTENSITY: Record<Intent, number> = {
  warmup: 0.65,
  cooldown: 0.65,
  steady: 0.65,
  recover: 0.5,
  work: 1.0,
};

export const STRENGTH_RPE = 6;
export const OTHER_RPE = 5;

/** The midpoint of a zone's band of FTP, as a share of threshold. */
export function zoneIntensity(zone: Zone): number {
  return ZONE_FTP_RIDE[zone] / 100;
}

/**
 * A share of threshold heart rate (percent) moved onto the power scale
 * (percent of FTP), linearly within the zone it falls in. Each zone runs
 * from its own low to the next zone's low, so the bands' one-percent gaps
 * disappear; above zone 7's top the scale is clamped.
 */
export function hrPctToFtpPct(hrPct: number): number {
  for (let i = ZONES.length - 1; i >= 0; i--) {
    const zone = ZONES[i]!;
    const hr = ZONE_HR_PCT[zone];
    if (hrPct < hr.low && zone !== 1) continue;
    const next = ZONES[i + 1];
    const hrTop = next ? ZONE_HR_PCT[next].low : hr.high;
    const ftpLow = ZONE_FTP_PCT[zone].low;
    const ftpTop = next ? ZONE_FTP_PCT[next].low : ZONE_FTP_PCT[zone].high;
    const t = Math.min(1, Math.max(0, (hrPct - hr.low) / (hrTop - hr.low)));
    return ftpLow + t * (ftpTop - ftpLow);
  }
  return 0;
}

/** The intensity a step's target stands for; see the file comment. */
export function targetIntensity(target: Target, intent: Intent): number {
  switch (target.kind) {
    case "zone":
      return zoneIntensity(target.zone as Zone);
    case "ftp_pct":
      return (target.low + target.high) / 200;
    case "hr_pct":
      return hrPctToFtpPct((target.low + target.high) / 2) / 100;
    case "rpe":
      return rpeIntensity(target.value);
    case "open":
      return OPEN_INTENSITY[intent];
  }
}

/**
 * The estimated load of a planned session, a whole number. `fallbackMinutes`
 * (the session's planned minutes) is used when the structure carries no
 * duration of its own — a bike session without steps is read as that
 * many minutes of steady riding, a strength or other session with 0
 * minutes as that many at its usual RPE.
 */
export function plannedLoad(structure: Structure, fallbackMinutes = 0): number {
  switch (structure.kind) {
    case "bike": {
      const steps = flattenSteps(structure);
      if (steps.length === 0)
        return Math.round(loadAt(fallbackMinutes * 60, OPEN_INTENSITY.steady));
      const load = steps.reduce(
        (sum, step) => sum + loadAt(step.seconds, targetIntensity(step.target, step.intent)),
        0,
      );
      return Math.round(load);
    }
    case "strength":
      return Math.round(rpeLoad(structure.minutes || fallbackMinutes, STRENGTH_RPE));
    case "other":
      return Math.round(rpeLoad(structure.minutes || fallbackMinutes, OTHER_RPE));
  }
}
