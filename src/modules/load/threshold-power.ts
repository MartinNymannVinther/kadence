import { CP_SECONDS, fitCriticalPower, plausibleFit } from "./critical-power";
import {
  atMost,
  firstWindow,
  forWindow,
  inWindow,
  MIN_RIDES,
  missing,
  source,
  type Confidence,
  type Context,
  type Estimate,
  type EstimateRide,
  type Method,
  type Note,
  type WindowDays,
} from "./threshold-shared";

/**
 * FTP proposed from the rides' power curves (docs/adr/0094), in this
 * order, over the last 90 days and else the year:
 *
 * 1. **Critical power** from the best 3, 5, 10, 15 and 20 minutes, when
 *    the fit is good (critical-power.ts); FTP is `CP_TO_FTP` of it, since
 *    CP sits about 3 % above an FTP from a 20-minute test (Karsten et al.
 *    2021: 256 against 249 W).
 * 2. **95 % of the best 20 minutes**, the classic 20-minute test's rule.
 * 3. Never below the best **60 minutes** the rider actually held (then at
 *    most medium: the 20 minutes were not all-out), and never above the
 *    best 20 minutes.
 *
 * Nothing is proposed without at least `MIN_RIDES` rides with power and
 * a 20-minute best that looks like a hard effort: at least
 * `MIN_TWENTY_OF_FIVE` of the best 5 minutes. An all-out power curve
 * has 20 minutes at about 80–90 % of 5 minutes; much less, and the 20
 * minutes were ridden easy (docs/research/taerskler-fra-turene.md).
 *
 * Pure: imports nothing from the database.
 */

export const CP_TO_FTP = 0.97;
export const TWENTY_TO_FTP = 0.95;
export const MIN_TWENTY_OF_FIVE = 0.75;
/** With fewer rides with power than this, a number is at most medium. */
export const RIDES_FOR_HIGH = 5;
export const FTP_RANGE = { low: 50, high: 700 } as const;

type Best = { watts: number; ride: EstimateRide };

function hasPower(ride: EstimateRide): boolean {
  return Object.values(ride.bestPowers ?? {}).some((w) => typeof w === "number" && w > 0);
}

/** The best watt over `seconds` in the rides, and the ride that holds it (the earlier on a tie). */
export function bestAt(rides: readonly EstimateRide[], seconds: number): Best | null {
  let best: Best | null = null;
  for (const ride of rides) {
    const watts = ride.bestPowers?.[String(seconds)];
    if (typeof watts !== "number" || !(watts > 0)) continue;
    if (!best || watts > best.watts || (watts === best.watts && ride.onDate < best.ride.onDate))
      best = { watts, ride };
  }
  return best;
}

/** Whether the ride's own pulse says its hardest 20 minutes were hard; null when it cannot say. */
export type HardByPulse = (ride: EstimateRide) => boolean | null;

function inDays(
  rides: readonly EstimateRide[],
  days: WindowDays,
  ctx: Context,
  hard: HardByPulse,
): Estimate {
  const withPower = inWindow(rides, days, ctx.today).filter(hasPower);
  if (withPower.length === 0) return missing("noPower", days);
  if (withPower.length < MIN_RIDES) return missing("fewPowerRides", days);
  const p20 = bestAt(withPower, 1200);
  if (!p20) return missing("noHardTwentyMinutes", days);
  const p5 = bestAt(withPower, 300);
  if (p5 && p20.watts < MIN_TWENTY_OF_FIVE * p5.watts) return missing("noHardTwentyMinutes", days);

  const notes: Note[] = [];
  const points = CP_SECONDS.flatMap((s) => {
    const b = bestAt(withPower, s);
    return b ? [{ seconds: s, watts: b.watts, ride: b.ride }] : [];
  });
  const fit = points.some((p) => p.seconds <= 300) ? fitCriticalPower(points) : null;
  let method: Method;
  let value: number;
  let held: EstimateRide[];
  let confidence: Confidence;
  if (fit && plausibleFit(fit, p20.watts)) {
    method = "criticalPower";
    value = fit.cp * CP_TO_FTP;
    held = points.map((p) => p.ride);
    confidence = "high";
  } else {
    method = "best20Power";
    value = p20.watts * TWENTY_TO_FTP;
    held = [p20.ride];
    confidence = "medium";
  }
  const p60 = bestAt(withPower, 3600);
  if (p60 && p60.watts > value) {
    method = "best60Power";
    value = p60.watts;
    held = [p60.ride];
    notes.push("hourWasHigher");
    // The hour is a floor the rider held, and it says the 20 minutes were not all-out.
    confidence = atMost(confidence, "medium");
  }
  value = Math.min(value, p20.watts);
  if (value < FTP_RANGE.low) return missing("noHardTwentyMinutes", days);

  if (!p5) {
    notes.push("noShortEfforts");
    confidence = "low";
  }
  const byPulse = hard(p20.ride);
  if (byPulse === false) {
    notes.push("effortNotHard");
    confidence = "low";
  } else if (byPulse === null) {
    notes.push("effortUnconfirmed");
    confidence = atMost(confidence, "medium");
  }
  if (withPower.length < RIDES_FOR_HIGH) {
    notes.push("fewRides");
    confidence = atMost(confidence, "medium");
  }
  confidence = forWindow(confidence, notes, days, ctx.youth);

  const seen = new Set<string>();
  const sources = held
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .sort((a, b) => b.onDate.localeCompare(a.onDate))
    .map(source);
  return {
    value: Math.min(FTP_RANGE.high, Math.round(value)),
    method,
    windowDays: days,
    confidence,
    sources,
    missing: null,
    notes,
  };
}

export function estimateFtp(
  rides: readonly EstimateRide[],
  ctx: Context,
  hard: HardByPulse,
): Estimate {
  return firstWindow((days) => inDays(rides, days, ctx, hard));
}
