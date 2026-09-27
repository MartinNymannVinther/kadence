import {
  ZONES,
  ZONE_FTP_PCT,
  ZONE_HR_PCT,
  type Target,
  type Zone,
} from "@/modules/workouts/structure";

/**
 * Kadence's seven zones applied to numbers: which zone a wattage or a
 * pulse falls in, what a session's target means in watts and beats for
 * one rider, and how long a ride spent in each zone.
 *
 * The bands themselves live in `src/modules/workouts/structure.ts` and
 * nowhere else; this file only reads them. They are whole percent of
 * threshold, inclusive, so a reading is rounded to a whole percent before
 * it is looked up — 55.4 % of FTP is zone 1, 55.6 % is zone 2 — and
 * anything above the top band is still zone 7.
 *
 * Pure: imports nothing from the database.
 */

type Bands = Record<Zone, { low: number; high: number }>;

/** Seconds per zone; index 0 is zone 1, index 6 is zone 7. */
export type ZoneSeconds = number[];

/** A rider's thresholds, as far as they are known. */
export interface Thresholds {
  ftp?: number | null;
  thresholdHr?: number | null;
}

export interface TargetRange {
  watts?: { low: number; high: number };
  bpm?: { low: number; high: number };
  rpe?: number;
}

function usable(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** The highest zone whose band starts at or below the whole percent. */
function zoneForPct(pct: number, bands: Bands): Zone {
  const whole = Math.round(pct);
  for (let i = ZONES.length - 1; i > 0; i--) {
    const zone = ZONES[i]!;
    if (whole >= bands[zone].low) return zone;
  }
  return 1;
}

function zoneFor(value: number, threshold: number | null | undefined, bands: Bands): Zone | null {
  if (!usable(threshold) || !Number.isFinite(value) || value < 0) return null;
  return zoneForPct((value / threshold) * 100, bands);
}

/** The zone a wattage falls in for a rider with this FTP; null without an FTP. */
export function zoneForPower(watts: number, ftp: number | null | undefined): Zone | null {
  return zoneFor(watts, ftp, ZONE_FTP_PCT);
}

/** The zone a pulse falls in for a rider with this threshold heart rate. */
export function zoneForHr(bpm: number, thresholdHr: number | null | undefined): Zone | null {
  return zoneFor(bpm, thresholdHr, ZONE_HR_PCT);
}

function band(threshold: number, low: number, high: number) {
  return { low: Math.round((threshold * low) / 100), high: Math.round((threshold * high) / 100) };
}

/**
 * What a step's target means for this rider, for the builder, the
 * calendar and the exporters: a zone reads as both watts and beats when
 * both thresholds are known, a share of FTP as watts, a share of
 * threshold heart rate as beats, an RPE as itself. Null when there is
 * nothing to show — an open step, or a target whose threshold the rider
 * has not set — so the UI falls back to the target's own words.
 */
export function targetRange(target: Target, rider: Thresholds): TargetRange | null {
  const range: TargetRange = {};
  switch (target.kind) {
    case "zone": {
      const zone = target.zone as Zone;
      if (usable(rider.ftp))
        range.watts = band(rider.ftp, ZONE_FTP_PCT[zone].low, ZONE_FTP_PCT[zone].high);
      if (usable(rider.thresholdHr))
        range.bpm = band(rider.thresholdHr, ZONE_HR_PCT[zone].low, ZONE_HR_PCT[zone].high);
      break;
    }
    case "ftp_pct":
      if (usable(rider.ftp)) range.watts = band(rider.ftp, target.low, target.high);
      break;
    case "hr_pct":
      if (usable(rider.thresholdHr)) range.bpm = band(rider.thresholdHr, target.low, target.high);
      break;
    case "rpe":
      range.rpe = target.value;
      break;
    case "open":
      break;
  }
  return Object.keys(range).length > 0 ? range : null;
}

/**
 * How many seconds of a 1 Hz stream fell in each zone. A null sample is a
 * second without a reading — a dropped sensor, a paused head unit — and
 * counts nowhere; 0 W is a reading (coasting) and counts in zone 1.
 * Without a threshold every zone is zero.
 */
export function timeInZones(
  samples1hz: readonly (number | null)[],
  threshold: number | null | undefined,
  kind: "power" | "hr",
): ZoneSeconds {
  const seconds: ZoneSeconds = ZONES.map(() => 0);
  if (!usable(threshold)) return seconds;
  const bands = kind === "power" ? ZONE_FTP_PCT : ZONE_HR_PCT;
  for (const sample of samples1hz) {
    if (sample === null || !Number.isFinite(sample) || sample < 0) continue;
    const zone = zoneForPct((sample / threshold) * 100, bands);
    seconds[zone - 1]! += 1;
  }
  return seconds;
}
