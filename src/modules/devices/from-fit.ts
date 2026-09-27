import { todayInCopenhagen } from "@/core/dates";
import { decodeFit, FitError, summarizeActivity } from "@/modules/fit";
import { activityLoad, bestMeanPowers, timeInZones, weightedPower } from "@/modules/load";

/**
 * A FIT file turned into the values of an `activities` row: decoded by
 * Kadence's own decoder (which refuses rather than guesses, and throws a
 * `FitError` with a code the upload can name), summarised, and given a
 * load by the best method the rider's thresholds allow (ADR 0016). Pure:
 * the upload, Wahoo and Garmin all come through here.
 */

export type RiderThresholds = { ftp: number | null; thresholdHr: number | null };

export type ActivityValues = {
  startedAt: Date;
  onDate: string;
  sport: "bike" | "other";
  movingSeconds: number;
  elapsedSeconds: number;
  distanceM: number | null;
  ascentM: number | null;
  avgPower: number | null;
  weightedPower: number | null;
  maxPower: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgCadence: number | null;
  workKj: number | null;
  zoneSeconds: { power: number[]; hr: number[] };
  bestPowers: Record<string, number>;
  streams: unknown;
  load: number | null;
  loadMethod: "power" | "hr" | "rpe" | "none";
  crcOk: boolean;
};

const int = (value: number | undefined) =>
  value === undefined || !Number.isFinite(value) ? null : Math.round(value);

/** Numbers a ride can plausibly have; anything else is the file lying. */
const MAX_SECONDS = 48 * 3600;
const MAX_DISTANCE_M = 2_000_000;
const MAX_ASCENT_M = 30_000;

const within = (value: number | undefined, max: number) =>
  value !== undefined && Number.isFinite(value) && value >= 0 && value <= max ? value : undefined;

export function activityFromFit(bytes: Uint8Array, rider: RiderThresholds): ActivityValues {
  const fit = decodeFit(bytes);
  const summary = summarizeActivity(fit);
  const year = summary.startedAt.getUTCFullYear();
  if (!Number.isFinite(summary.startedAt.getTime()) || year < 1990 || year > 2100)
    throw new FitError("corrupt", "The ride's start time is not a real time.");
  const hasPower = summary.power1hz.some((p) => p !== null && p > 0);
  const weighted = hasPower ? int(weightedPower(summary.power1hz) ?? undefined) : null;
  const load = activityLoad(
    {
      sport: summary.sport,
      seconds: summary.movingSeconds,
      power1hz: hasPower ? summary.power1hz : null,
      avgHr: summary.avgHr ?? null,
    },
    { ftp: rider.ftp, thresholdHr: rider.thresholdHr },
  );
  return {
    startedAt: summary.startedAt,
    onDate: todayInCopenhagen(summary.startedAt),
    sport: summary.sport,
    movingSeconds: summary.movingSeconds,
    elapsedSeconds: int(within(summary.elapsedSeconds, MAX_SECONDS)) ?? summary.movingSeconds,
    distanceM: int(within(summary.distanceM, MAX_DISTANCE_M)),
    ascentM: int(within(summary.ascentM, MAX_ASCENT_M)),
    avgPower: int(summary.avgPower),
    weightedPower: weighted,
    maxPower: int(summary.maxPower),
    avgHr: int(summary.avgHr),
    maxHr: int(summary.maxHr),
    avgCadence: int(summary.avgCadence),
    workKj: int(summary.workKj),
    zoneSeconds: {
      power: timeInZones(summary.power1hz, rider.ftp, "power"),
      hr: timeInZones(summary.hr1hz, rider.thresholdHr, "hr"),
    },
    bestPowers: hasPower
      ? Object.fromEntries(
          Object.entries(bestMeanPowers(summary.power1hz)).map(([k, v]) => [k, Math.round(v)]),
        )
      : {},
    streams: summary.streams,
    load: load.method === "none" ? null : load.load,
    loadMethod: load.method,
    crcOk: fit.crcOk,
  };
}
