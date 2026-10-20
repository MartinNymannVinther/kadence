import { addDaysIso } from "@/core/dates";

/**
 * Which ride Today asks "Hvor hårdt føltes turen?" about (docs/adr/0063):
 * the rider's most recent ride of the last three days, and only while it
 * has no RPE — the question is asked while the ride is still in the legs,
 * and once. A ride the rider put off ("Ikke nu") on this device is not
 * asked about again. Pure.
 */

export const RPE_WINDOW_DAYS = 3;

export type RateCandidate = {
  id: string;
  onDate: string;
  startedAt: Date;
  rpe: number | null;
};

export function rideToRate<T extends RateCandidate>(
  rides: readonly T[],
  today: string,
  putOff: ReadonlySet<string> = new Set(),
): T | null {
  const from = addDaysIso(today, -(RPE_WINDOW_DAYS - 1));
  const latest = rides
    .filter((r) => r.onDate >= from && r.onDate <= today)
    .reduce<T | null>(
      (best, r) => (best === null || r.startedAt.getTime() > best.startedAt.getTime() ? r : best),
      null,
    );
  if (!latest || latest.rpe !== null || putOff.has(latest.id)) return null;
  return latest;
}
