import { addDaysIso } from "@/core/dates";
import { BEST_POWER_SECONDS, POWER_CURVE_SECONDS } from "./weighted-power";

/**
 * A rider's records — against themselves, never against anyone else
 * (ADR 0013): the best watt over each duration, the longest ride, the
 * most climbing and the longest time on the bike, each with the ride it
 * was set on, over the last month, half year, year, or ever. Nothing is
 * stored: a record is the ride that holds it, read from what every ride
 * already keeps (`best_powers`, distance, ascent, moving time), so a
 * deleted ride takes its record with it and the next best stands.
 *
 * Pure: imports nothing from the database.
 */

export const PERIODS = ["month", "halfYear", "year", "all"] as const;
export type Period = (typeof PERIODS)[number];
export const PERIOD_DAYS: Record<Period, number | null> = {
  month: 30,
  halfYear: 183,
  year: 365,
  all: null,
};

export type RecordSource = {
  id: string;
  onDate: string;
  title: string;
  sport: string;
  bestPowers: Record<string, number> | null;
  distanceM: number | null;
  ascentM: number | null;
  movingSeconds: number;
};

export type Holder = { activityId: string; onDate: string; title: string };
export type PowerRecord = Holder & { seconds: number; watts: number };
export type RideRecord = Holder & { value: number };

export type Records = {
  power: PowerRecord[];
  longestKm: RideRecord | null;
  mostClimbingM: RideRecord | null;
  longestHours: RideRecord | null;
};

export function inPeriod(sources: readonly RecordSource[], period: Period, today: string) {
  const days = PERIOD_DAYS[period];
  const from = days === null ? "" : addDaysIso(today, -days);
  return sources.filter((s) => s.sport === "bike" && s.onDate >= from && s.onDate <= today);
}

/** The best watt for every duration in the curve, and which ride holds it. */
export function bestCurve(sources: readonly RecordSource[]): Map<number, PowerRecord> {
  const best = new Map<number, PowerRecord>();
  for (const s of sources) {
    if (!s.bestPowers) continue;
    for (const seconds of POWER_CURVE_SECONDS) {
      const watts = s.bestPowers[String(seconds)];
      if (typeof watts !== "number" || !(watts > 0)) continue;
      const holder = best.get(seconds);
      // A tie goes to the earlier ride: the record was set first there.
      if (!holder || watts > holder.watts || (watts === holder.watts && s.onDate < holder.onDate))
        best.set(seconds, { seconds, watts, activityId: s.id, onDate: s.onDate, title: s.title });
    }
  }
  return best;
}

function top(
  sources: readonly RecordSource[],
  value: (s: RecordSource) => number | null,
): RideRecord | null {
  let best: RideRecord | null = null;
  for (const s of sources) {
    const v = value(s);
    if (v === null || !(v > 0)) continue;
    if (!best || v > best.value || (v === best.value && s.onDate < best.onDate))
      best = { value: v, activityId: s.id, onDate: s.onDate, title: s.title };
  }
  return best;
}

export function records(sources: readonly RecordSource[], period: Period, today: string): Records {
  const rides = inPeriod(sources, period, today);
  const curve = bestCurve(rides);
  return {
    power: BEST_POWER_SECONDS.flatMap((s) => curve.get(s) ?? []),
    longestKm: top(rides, (s) =>
      s.distanceM === null ? null : Math.round(s.distanceM / 100) / 10,
    ),
    mostClimbingM: top(rides, (s) => s.ascentM),
    longestHours: top(rides, (s) => Math.round((s.movingSeconds / 3600) * 10) / 10),
  };
}

/** The durations on which `activityId` holds the period's record: what this ride set. */
export function recordsSetBy(curve: Map<number, PowerRecord>, activityId: string): number[] {
  return [...curve.values()].filter((r) => r.activityId === activityId).map((r) => r.seconds);
}
