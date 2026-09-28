import { todayInCopenhagen } from "@/core/dates";
import { decodeActivityFile, type ActivityFormat } from "@/modules/files";
import { FitError, summarizeActivity, type ClimbSummary, type LapSummary } from "@/modules/fit";
import {
  activityLoad,
  heartRateDrift,
  powerCurve,
  timeInZones,
  weightedPower,
} from "@/modules/load";

/**
 * An activity file turned into the values of an `activities` row: FIT,
 * TCX or GPX, bare or in an archive (src/modules/files), decoded by
 * Kadence's own readers (which refuse rather than guess, and throw a
 * `FitError` with a code the upload can name), summarised, and given a
 * load by the best method the rider's thresholds allow (ADR 0016). Pure:
 * the upload, Wahoo, Garmin and Polar all come through here.
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
  maxSpeed: number | null;
  hrDrift: number | null;
  workKj: number | null;
  laps: LapSummary[];
  climbs: ClimbSummary[];
  zoneSeconds: { power: number[]; hr: number[] };
  bestPowers: Record<string, number>;
  streams: unknown;
  load: number | null;
  loadMethod: "power" | "hr" | "rpe" | "none";
  crcOk: boolean;
  format: ActivityFormat;
  /** The ride's own name, where the file carries one (a GPX track's). */
  title?: string;
};

const int = (value: number | undefined) =>
  value === undefined || !Number.isFinite(value) ? null : Math.round(value);

/** Numbers a ride can plausibly have; anything else is the file lying. */
const MAX_SECONDS = 48 * 3600;
const MAX_DISTANCE_M = 2_000_000;
const MAX_ASCENT_M = 30_000;
/** m/s, the timeline's own ceiling (`PLAUSIBLE.maxSpeed`). */
const MAX_SPEED = 40;

const within = (value: number | undefined, max: number) =>
  value !== undefined && Number.isFinite(value) && value >= 0 && value <= max ? value : undefined;

export function activityFromFit(bytes: Uint8Array, rider: RiderThresholds): ActivityValues {
  const { fit, format, title } = decodeActivityFile(bytes);
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
    maxSpeed: within(summary.maxSpeed, MAX_SPEED) ?? null,
    hrDrift: hasPower ? heartRateDrift(summary.power1hz, summary.hr1hz) : null,
    workKj: int(summary.workKj),
    laps: summary.laps,
    climbs: summary.climbs,
    zoneSeconds: {
      power: timeInZones(summary.power1hz, rider.ftp, "power"),
      hr: timeInZones(summary.hr1hz, rider.thresholdHr, "hr"),
    },
    bestPowers: hasPower ? powerCurve(summary.power1hz) : {},
    streams: summary.streams,
    load: load.method === "none" ? null : load.load,
    loadMethod: load.method,
    crcOk: fit.crcOk,
    format,
    title,
  };
}
