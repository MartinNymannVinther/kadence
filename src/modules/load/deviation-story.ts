import type { Zone } from "@/modules/workouts/structure";
import type { LoadMethod } from "./activity-load";
import { HR_RATIO_CAP } from "./activity-load";
import { loadAt, LOAD_PER_HOUR_AT_THRESHOLD } from "./calibration";
import { colourOfPct, type ComplianceRatio } from "./compliance";
import { zoneForPower } from "./zones";

/**
 * A deviation told in words instead of load numbers (docs/adr/0095, the
 * amendment of 13 October): what the plan was, how the ride went, how
 * much more or less it asked of the body as a whole, and — when the
 * numbers say the threshold is likely set too low — a hint to look at it.
 *
 * **Where the intensity comes from.** The ride row does not keep the
 * share of threshold `activity-load.ts` computed, but it keeps the load
 * and the moving time it was computed from: load = hours × intensity² ×
 * 100 (`calibration.ts`), so intensity = √(load ÷ (hours × 100)). That is
 * the very number the load was made of, with the thresholds the rider had
 * when the ride came in (or was read again), and it agrees with the
 * colour — only the load's rounding to whole units is lost. Today's
 * thresholds are deliberately not used: they may have changed since.
 *
 * - power: the weighted power ÷ FTP;
 * - heart rate: the average heart rate ÷ threshold heart rate, capped at
 *   1.05 by `activity-load.ts`; a load at the cap says the threshold was
 *   probably out of date;
 * - RPE: no share of anything; the effort word compares the ride's load
 *   per hour with the plan's, which is how it felt against the plan.
 *
 * The plan's intensity is its load per hour on the same scale, so the
 * effort word ("en del hårdere") compares like with like.
 *
 * Pure: imports nothing from the database.
 */

export type PlanCharacter = "easy" | "tempo" | "threshold" | "intervals" | "strength" | "session";
export type Effort = "muchHarder" | "harder" | "same" | "easier" | "muchEasier";
export type TimeDirection = "shorter" | "longer" | "same";

export type DeviationStory = {
  plan: { character: PlanCharacter; minutes: number | null };
  ride: {
    minutes: number;
    method: LoadMethod;
    /** Average share of threshold in whole percent, by power or heart rate. */
    intensityPct: number | null;
    rpe: number | null;
    /** The ride's intensity against the plan's; null when either has no load. */
    effort: Effort | null;
  };
  /** Done ÷ planned load as words: only when the colour was read by load and is off. */
  whole: {
    direction: "more" | "less";
    /** The difference rounded to tens, 10–90 % for less. */
    pct: number;
    /** "2.5 times" when the load was about twice or more the plan's; else null. */
    times: number | null;
    time: TimeDirection;
  } | null;
  thresholdHint: "ftp" | "hr" | null;
};

/** A ride shorter than this says too little about a threshold. */
export const HINT_MIN_MINUTES = 20;
/** Above this average share of FTP for 20 minutes or more, the FTP is likely set too low. */
export const HINT_POWER_INTENSITY = 1.05;

const positive = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

/** The share of threshold a load over these minutes stands for: the inverse of `loadAt`. */
export function intensityOfLoad(load: number, minutes: number): number | null {
  if (!positive(load) || !positive(minutes)) return null;
  return Math.sqrt(load / ((minutes / 60) * LOAD_PER_HOUR_AT_THRESHOLD));
}

function characterOfZone(zone: Zone): PlanCharacter {
  return zone <= 2 ? "easy" : zone === 3 ? "tempo" : zone === 4 ? "threshold" : "intervals";
}

/** What the plan was, in a word: from its zones, its load per hour, or "easy" with only minutes. */
export function planCharacter(
  sport: "bike" | "strength" | "other",
  zone: Zone | null,
  load: number | null | undefined,
  minutes: number,
): PlanCharacter {
  if (sport === "strength") return "strength";
  if (sport === "other") return "session";
  if (zone !== null) return characterOfZone(zone);
  const intensity = intensityOfLoad(load ?? 0, minutes);
  const byLoad = intensity === null ? null : zoneForPower(intensity * 100, 100);
  return byLoad === null ? "easy" : characterOfZone(byLoad);
}

function effortOf(ratio: number): Effort {
  if (ratio >= 1.25) return "muchHarder";
  if (ratio >= 1.08) return "harder";
  if (ratio > 0.92) return "same";
  if (ratio > 0.75) return "easier";
  return "muchEasier";
}

/** Never "about as planned" or the other way under a heading that says harder or easier. */
function agreeing(effort: Effort, heading: string | null): Effort {
  if (heading === "harder" && !["harder", "muchHarder"].includes(effort)) return "harder";
  if (heading === "easier" && !["easier", "muchEasier"].includes(effort)) return "easier";
  return effort;
}

function timeDirection(plannedMinutes: number, doneMinutes: number): TimeDirection {
  if (!positive(plannedMinutes)) return "same";
  const pct = Math.round((doneMinutes / plannedMinutes) * 100);
  if (colourOfPct(pct) === "green") return "same";
  return pct < 100 ? "shorter" : "longer";
}

/** The whole, from the very ratio the colour was read from. */
export function wholeOf(
  ratio: ComplianceRatio | null,
  plannedMinutes: number,
  doneMinutes: number,
): DeviationStory["whole"] {
  if (ratio?.by !== "load" || ratio.pct === 100) return null;
  const direction = ratio.pct > 100 ? "more" : "less";
  const tens = Math.max(10, Math.round(Math.abs(ratio.pct - 100) / 10) * 10);
  return {
    direction,
    pct: direction === "less" ? Math.min(90, tens) : tens,
    times: ratio.pct >= 195 ? Math.round(ratio.pct / 50) / 2 : null,
    time: timeDirection(plannedMinutes, doneMinutes),
  };
}

/**
 * The FTP hint: by power, 20 minutes or more averaging over 105 % of FTP
 * (two decimals, as `activity-load.ts` rounds it). By heart rate: a load
 * at the cap, which a stored whole-unit load can only show as "the cap
 * rounded", so it is compared in load units rather than as a ratio.
 */
export function thresholdHint(
  method: LoadMethod,
  load: number | null | undefined,
  minutes: number,
): "ftp" | "hr" | null {
  if (!positive(load) || minutes < HINT_MIN_MINUTES) return null;
  if (method === "power") {
    const intensity = intensityOfLoad(load, minutes);
    return intensity !== null && Math.round(intensity * 100) / 100 > HINT_POWER_INTENSITY
      ? "ftp"
      : null;
  }
  if (method === "hr") return load >= Math.round(loadAt(minutes * 60, HR_RATIO_CAP)) ? "hr" : null;
  return null;
}

export type StoryInput = {
  sport: "bike" | "strength" | "other";
  plannedZone: Zone | null;
  planned: { minutes: number; load?: number | null };
  done: { minutes: number; load?: number | null; method?: LoadMethod | null; rpe?: number | null };
  ratio: ComplianceRatio | null;
  heading: string | null;
};

export function deviationStory(input: StoryInput): DeviationStory {
  const { planned, done } = input;
  const method: LoadMethod = done.method ?? "none";
  const doneIntensity = intensityOfLoad(done.load ?? 0, done.minutes);
  const plannedIntensity = intensityOfLoad(planned.load ?? 0, planned.minutes);
  const effort =
    doneIntensity !== null && plannedIntensity !== null
      ? agreeing(effortOf(doneIntensity / plannedIntensity), input.heading)
      : null;
  return {
    plan: {
      character: planCharacter(input.sport, input.plannedZone, planned.load, planned.minutes),
      minutes: positive(planned.minutes) ? Math.round(planned.minutes) : null,
    },
    ride: {
      minutes: Math.round(done.minutes),
      method,
      intensityPct:
        (method === "power" || method === "hr") && doneIntensity !== null
          ? Math.round(doneIntensity * 100)
          : null,
      rpe: positive(done.rpe) ? done.rpe : null,
      effort,
    },
    whole: input.heading ? wholeOf(input.ratio, planned.minutes, done.minutes) : null,
    thresholdHint: thresholdHint(method, done.load, done.minutes),
  };
}
