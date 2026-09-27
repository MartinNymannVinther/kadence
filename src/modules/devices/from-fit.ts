import { todayInCopenhagen } from "@/core/dates";
import { decodeFit, summarizeActivity } from "@/modules/fit";
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

export function activityFromFit(bytes: Uint8Array, rider: RiderThresholds): ActivityValues {
  const fit = decodeFit(bytes);
  const summary = summarizeActivity(fit);
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
    elapsedSeconds: summary.elapsedSeconds,
    distanceM: int(summary.distanceM),
    ascentM: int(summary.ascentM),
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
