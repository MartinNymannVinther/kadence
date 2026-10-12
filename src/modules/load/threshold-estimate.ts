import { ageIn } from "./heart-rate-summary";
import {
  estimateMaxHr,
  estimateRestingHr,
  estimateThresholdHr,
  hardByPulse,
  referenceMax,
  type RestingMeasurement,
} from "./threshold-heart";
import { estimateFtp, TWENTY_TO_FTP } from "./threshold-power";
import {
  inWindow,
  WINDOWS,
  type Context,
  type Current,
  type Estimate,
  type EstimateRide,
} from "./threshold-shared";

/**
 * Kadence's proposal for a rider's thresholds, from their own rides
 * (docs/adr/0094): FTP from the power curves, threshold and max pulse
 * from the pulse of the few hardest rides, resting pulse from what was
 * measured by hand. Rules only — no model is asked — and nothing is
 * saved: the numbers fill the thresholds form, and the rider or the
 * coach decides.
 *
 * Each number carries how it was found, over which days, how sure
 * Kadence is, and the rides behind it; or why there is none.
 *
 * Pure: imports nothing from the database. The service that feeds it is
 * src/modules/training/threshold-proposal.ts.
 */

export type ThresholdKey = "ftpWatts" | "thresholdHr" | "maxHr" | "restingHr";
export const THRESHOLD_KEYS: readonly ThresholdKey[] = [
  "ftpWatts",
  "thresholdHr",
  "maxHr",
  "restingHr",
];

export type ThresholdEstimates = Record<ThresholdKey, Estimate>;

export type EstimateInput = {
  rides: readonly EstimateRide[];
  resting: readonly RestingMeasurement[];
  birthYear: number;
  today: string;
  current: Current;
};

/** Riders under 19 in the year: U17 and U19 grow and get stronger within a season. */
export function isYouthAge(age: number): boolean {
  return age < 19;
}

export function estimateThresholds(input: EstimateInput): ThresholdEstimates {
  const age = ageIn(input.birthYear, input.today);
  const ctx: Context = { today: input.today, youth: isYouthAge(age), age, current: input.current };
  const refMax = referenceMax(inWindow(input.rides, 365, input.today), ctx);
  return {
    ftpWatts: estimateFtp(input.rides, ctx, (ride) => hardByPulse(ride, refMax)),
    thresholdHr: estimateThresholdHr(input.rides, ctx),
    maxHr: estimateMaxHr(input.rides, ctx),
    restingHr: estimateRestingHr(input.resting, ctx),
  };
}

/** What the service knows about every ride before it reads any stream. */
export type CandidateRide = {
  id: string;
  onDate: string;
  movingSeconds: number;
  bestPowers: Record<string, number> | null;
  avgHr: number | null;
  maxHr: number | null;
};

/** How many rides each ranking adds per window. */
export const PER_RANKING = 3;

function topBy(
  rides: readonly CandidateRide[],
  value: (r: CandidateRide) => number | null,
): string[] {
  return rides
    .map((r) => ({ id: r.id, v: value(r) }))
    .filter((r): r is { id: string; v: number } => typeof r.v === "number" && r.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, PER_RANKING)
    .map((r) => r.id);
}

/**
 * The few rides whose pulse stream is worth reading: in each window, the
 * best 20 minutes of power, the highest max pulse and the highest average
 * pulse over at least 20 minutes — three of each. At most
 * 2 × 3 × 3 = 18 rides, usually far fewer, however many the year holds.
 */
export function heartRateCandidates(rides: readonly CandidateRide[], today: string): string[] {
  const ids = new Set<string>();
  for (const days of WINDOWS) {
    const inDays = inWindow(rides, days, today).filter((r) => r.avgHr !== null);
    for (const id of topBy(inDays, (r) => r.bestPowers?.["1200"] ?? null)) ids.add(id);
    for (const id of topBy(inDays, (r) => r.maxHr)) ids.add(id);
    for (const id of topBy(inDays, (r) => (r.movingSeconds >= 1200 ? r.avgHr : null))) ids.add(id);
  }
  return [...ids];
}

/** How much a ride must beat the saved FTP before its page says so. Kadence's judgement. */
export const RAISE_SHARE = 1.05;

/**
 * Whether a ride's best 20 minutes say the saved FTP is too low: 95 % of
 * them more than 5 % above it. The ride's page then points to the
 * proposal; it never changes the number itself.
 */
export function ftpLooksRaised(
  bestPowers: Record<string, number> | null,
  ftp: number | null,
): boolean {
  const p20 = bestPowers?.["1200"];
  if (typeof p20 !== "number" || ftp === null || !(ftp > 0)) return false;
  return p20 * TWENTY_TO_FTP > ftp * RAISE_SHARE;
}
