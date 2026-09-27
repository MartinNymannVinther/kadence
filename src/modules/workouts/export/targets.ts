import {
  ZONE_FTP_PCT,
  ZONE_FTP_RIDE,
  ZONE_HR_PCT,
  ZONES,
  type Target,
  type Zone,
} from "@/modules/workouts/structure";

/**
 * What a step asks for, in the terms workout files speak. The zone tables
 * are `structure.ts`'s and read from nowhere else.
 *
 * `powerPct` is for the formats that only know power (.zwo, .erg, .mrc),
 * as one number, percent of FTP:
 * - a zone: the power it is ridden at, ZONE_FTP_RIDE (zone 4 is 98 %,
 *   zone 1 is 50 %: easy spinning, not the middle of 0–55 %);
 * - a share of FTP: the middle of the range;
 * - a share of threshold heart rate: an approximation, stated here because
 *   it is one. The zone whose ZONE_HR_PCT band holds the middle of the range
 *   is ridden at the middle of the same zone's power band — the two tables
 *   are Kadence's one zone model seen from two sensors, zone for zone. A
 *   rider with a trainer in ERG mode gets a power that should land near the
 *   pulse the coach asked for; the pulse itself is not in the file;
 * - an RPE or no target: no power at all (null). How hard it should feel is
 *   the rider's to judge, and a file that fixed a wattage would be guessing.
 *
 * `powerBand` is for FIT workouts, which carry a range: the zone's band or
 * the share of FTP as written; null for everything that is not power.
 */

/** The power a zone is ridden at, from the shared table (ZONE_FTP_RIDE). */
export function zoneMidpointPct(zone: Zone): number {
  return ZONE_FTP_RIDE[zone];
}

/** The zone whose heart rate band holds `pct` percent of threshold heart rate. */
export function zoneOfHrPct(pct: number): Zone {
  return ZONES.find((zone) => pct <= ZONE_HR_PCT[zone].high) ?? 7;
}

function asZone(value: number): Zone {
  return ZONES.find((zone) => zone === value) ?? 1;
}

export function powerPct(target: Target): number | null {
  switch (target.kind) {
    case "zone":
      return zoneMidpointPct(asZone(target.zone));
    case "ftp_pct":
      return (target.low + target.high) / 2;
    case "hr_pct":
      return zoneMidpointPct(zoneOfHrPct((target.low + target.high) / 2));
    case "rpe":
    case "open":
      return null;
  }
}

export function powerBand(target: Target): { low: number; high: number } | null {
  if (target.kind === "zone") return { ...ZONE_FTP_PCT[asZone(target.zone)] };
  if (target.kind === "ftp_pct")
    return { low: Math.min(target.low, target.high), high: Math.max(target.low, target.high) };
  return null;
}

/** A step's cadence as one number (the middle of a range), or null when it names none. */
export function cadenceOf(step: { cadenceLow?: number; cadenceHigh?: number }): number | null {
  const { cadenceLow: low, cadenceHigh: high } = step;
  if (low !== undefined && high !== undefined) return Math.round((low + high) / 2);
  return low ?? high ?? null;
}
