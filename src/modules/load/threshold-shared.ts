import { addDaysIso } from "@/core/dates";
import type { RideHeartRate } from "./heart-rate-summary";

/**
 * The words the threshold proposal is told in (docs/adr/0094): what a
 * ride looks like to it, what one proposed number carries — the value,
 * how it was found, over which days, how sure Kadence is and the rides
 * it came from — and why a number may be missing. Shared by
 * threshold-power.ts and threshold-heart.ts.
 *
 * Pure: imports nothing from the database.
 */

/** The last 90 days first; the year when 90 days hold too little. */
export const WINDOWS = [90, 365] as const;
export type WindowDays = (typeof WINDOWS)[number];

/** At least this many rides with the channel in the window. Kadence's judgement. */
export const MIN_RIDES = 3;

export const CONFIDENCES = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCES)[number];
export const METHODS = [
  "criticalPower",
  "best20Power",
  "best60Power",
  "best20HeartRate",
  "heldMaxHeartRate",
  "measuredRestingHr",
] as const;
export type Method = (typeof METHODS)[number];
/** Why a number is not proposed: one plain sentence each in the panel. */
export const MISSING = [
  "noPower",
  "fewPowerRides",
  "noHardTwentyMinutes",
  "noHeartRate",
  "fewHeartRateRides",
  "noHardHeartRate",
  "noAllOut",
  "notAboveCurrent",
  "noMeasurement",
] as const;
export type Missing = (typeof MISSING)[number];
/** Why Kadence is less sure than the method alone would make it. */
export const NOTES = [
  "wideWindow",
  "youthGrows",
  "fewRides",
  "effortUnconfirmed",
  "effortNotHard",
  "noShortEfforts",
  "hourWasHigher",
] as const;
export type Note = (typeof NOTES)[number];

/** What the proposal reads about one ride. */
export type EstimateRide = {
  id: string;
  onDate: string;
  title: string;
  /** The ride's power curve, best watt by seconds (`activities.best_powers`). */
  bestPowers: Record<string, number> | null;
  /** Whether the ride has a pulse at all (`activities.avg_hr`). */
  hasHeartRate: boolean;
  /** Read from the stream for the few candidate rides only; absent for the rest. */
  heartRate?: RideHeartRate | null;
};

/** A ride (or, for the resting pulse, a measurement) a number came from. */
export type Source = { activityId: string | null; onDate: string; title: string };

export type Estimate = {
  value: number | null;
  method: Method | null;
  windowDays: WindowDays | null;
  confidence: Confidence | null;
  sources: Source[];
  missing: Missing | null;
  notes: Note[];
};

export type Current = {
  ftpWatts: number | null;
  thresholdHr: number | null;
  maxHr: number | null;
  restingHr: number | null;
};

/** What every estimator is handed beside the rides. */
export type Context = { today: string; youth: boolean; age: number; current: Current };

export function inWindow<T extends { onDate: string }>(
  items: readonly T[],
  days: number,
  today: string,
): T[] {
  const from = addDaysIso(today, -days);
  return items.filter((r) => r.onDate >= from && r.onDate <= today);
}

export function missing(reason: Missing, windowDays: WindowDays | null = null): Estimate {
  return {
    value: null,
    method: null,
    windowDays,
    confidence: null,
    sources: [],
    missing: reason,
    notes: [],
  };
}

const ORDER: Confidence[] = ["low", "medium", "high"];

/** The lower of two confidences. */
export function atMost(a: Confidence, cap: Confidence): Confidence {
  return ORDER.indexOf(a) < ORDER.indexOf(cap) ? a : cap;
}

/** One step down: what a whole year of data costs a number that changes with form. */
export function stepDown(a: Confidence): Confidence {
  return ORDER[Math.max(0, ORDER.indexOf(a) - 1)]!;
}

/**
 * A number that follows form (FTP, threshold pulse) found over the whole
 * year is one step less sure, and a young rider's is low: they grow and
 * get stronger within a season.
 */
export function forWindow(
  confidence: Confidence,
  notes: Note[],
  windowDays: WindowDays,
  youth: boolean,
): Confidence {
  if (windowDays === 90) return confidence;
  notes.push(youth ? "youthGrows" : "wideWindow");
  return youth ? "low" : stepDown(confidence);
}

/** The first window that gives a number; else the widest window's reason. */
export function firstWindow(estimate: (days: WindowDays) => Estimate): Estimate {
  let last: Estimate | null = null;
  for (const days of WINDOWS) {
    last = estimate(days);
    if (last.value !== null) return last;
  }
  return last!;
}

export function source(ride: Pick<EstimateRide, "id" | "onDate" | "title">): Source {
  return { activityId: ride.id, onDate: ride.onDate, title: ride.title };
}
