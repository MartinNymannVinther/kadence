import { diffDays } from "@/core/dates";
import type { ComplianceColour } from "./compliance";
import type { WellbeingStatus } from "./wellbeing";

/**
 * Guardrails, not bans: the things a coach should see about a rider's
 * week, each shown and none enforced (CLAUDE.md, product principles).
 *
 * Every rule is a small pure function that returns a flag or nothing; a
 * flag names its kind, how much it matters and the numbers behind it, so
 * the UI can build its sentence through i18n — there is no UI text here.
 * DCU's numbers (the corridor, the longest-ride limit) and the sleep
 * minimum for the rider's age come in as input; this file holds only the
 * rules.
 *
 * Severity: **alert** asks for action today, **warn** for a look this
 * week, **info** is worth knowing.
 *
 * Pure: imports nothing from the database.
 */

export type Severity = "info" | "warn" | "alert";

export type FlagKind =
  | "hours_above_corridor"
  | "hours_below_corridor"
  | "ramp"
  | "longest_ride"
  | "strength_spacing"
  | "wellbeing_talk"
  | "wellbeing_help"
  | "pain"
  | "sleep_short"
  | "sleep_below_minimum"
  | "compliance";

export interface Flag {
  kind: FlagKind;
  severity: Severity;
  values: Record<string, number | string>;
}

export interface Corridor {
  low: number;
  target: number;
  high: number;
}

export interface RideLimit {
  hours: number;
  km: number;
}

export interface GuardrailInput {
  /** The week's hours on the bike; only these count toward DCU's hours. */
  bikeHours: number;
  /** DCU's corridor for the rider's class and the week, in hours. */
  corridor?: Corridor | null;
  /** Bike hours of the previous 3–4 weeks. */
  previousWeeksHours?: readonly number[];
  /** The week's longest ride; `km` is null for a ride on rollers. */
  longestRide?: { hours: number; km?: number | null } | null;
  /** DCU's longest ride for the class; null where DCU sets none (U23). */
  longestRideLimit?: RideLimit | null;
  /** ISO dates of the week's strength sessions, and the days around it. */
  strengthDates?: readonly string[];
  wellbeing?: WellbeingStatus | null;
  /** The latest check-in's pain, 0–3. */
  latestPain?: number | null;
  /** Hours slept each night of the last 7 days; null for a night not reported. */
  sleepHours?: readonly (number | null)[];
  /** The rider's minimum by age: 8 h for 14–17-year-olds. */
  sleepMinimum?: number | null;
  /** The colours of the week's planned sessions so far. */
  compliance?: readonly ComplianceColour[];
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * The week against DCU's corridor: above its top is a warning, below its
 * floor worth knowing. DCU asks riders to train "neither much more nor
 * much less" than its hours (docs/research/dcu-traeningsanbefalinger.md
 * §3, B p. 12, C p. 13). A week in progress is below the floor until it
 * is ridden, so pass planned and done hours together.
 */
export function corridorFlag(
  bikeHours: number,
  corridor: Corridor | null | undefined,
): Flag | null {
  if (!corridor) return null;
  const values = { hours: round1(bikeHours), ...corridor };
  if (bikeHours > corridor.high) return { kind: "hours_above_corridor", severity: "warn", values };
  if (bikeHours < corridor.low) return { kind: "hours_below_corridor", severity: "info", values };
  return null;
}

/** The ramp's ceiling, in percent over the previous weeks' average. */
export const RAMP_LIMIT_PCT = 15;
/** A rise smaller than this, in hours, is noise however large in percent. */
export const RAMP_MIN_HOURS = 1;

/**
 * The week against the average of the weeks before it: more than 15 %
 * above, and at least an hour more, is a warning. DCU calls a 10–15 %
 * rise in volume natural for a U19 from one year to the next (C p. 12)
 * and warns against sudden, violent jumps, which risk overtraining and
 * joint and tendon injuries (B pp. 14–15, C p. 17); Kadence borrows the
 * top of that range as a week-to-week ceiling, an interpretation of its
 * own (docs/research/dcu-traeningsanbefalinger.md §3). The rise is read in
 * whole percent, so exactly 15 % stays quiet. No baseline, no ramp: a
 * first week back after a break is left to the corridor.
 */
export function rampFlag(bikeHours: number, previousWeeksHours: readonly number[]): Flag | null {
  if (previousWeeksHours.length === 0) return null;
  const average = previousWeeksHours.reduce((sum, h) => sum + h, 0) / previousWeeksHours.length;
  if (!(average > 0)) return null;
  const percent = Math.round((bikeHours / average - 1) * 100);
  if (percent <= RAMP_LIMIT_PCT || bikeHours - average < RAMP_MIN_HOURS) return null;
  return {
    kind: "ramp",
    severity: "warn",
    values: { hours: round1(bikeHours), average: round1(average), percent, limit: RAMP_LIMIT_PCT },
  };
}

/**
 * The week's longest ride against DCU's limit for the class — never over
 * 4 hours or 120 km for U17, 5 hours or 150 km for U19 (B p. 15, C p. 18):
 * over either is a warning.
 */
export function longestRideFlag(
  ride: { hours: number; km?: number | null } | null | undefined,
  limit: RideLimit | null | undefined,
): Flag | null {
  if (!ride || !limit) return null;
  const km = typeof ride.km === "number" ? ride.km : null;
  if (ride.hours <= limit.hours && (km === null || km <= limit.km)) return null;
  const values: Record<string, number> = {
    hours: round1(ride.hours),
    limitHours: limit.hours,
    limitKm: limit.km,
  };
  if (km !== null) values.km = Math.round(km);
  return { kind: "longest_ride", severity: "warn", values };
}

/**
 * Strength sessions need at least 48 hours between them (DCU's
 * programmes, D p. 2, E p. 2, F p. 1). Sessions carry a day, not a clock,
 * so two days apart counts as 48 hours and one day apart, or the same
 * day, as too close: one warning per pair.
 */
export function strengthSpacingFlags(dates: readonly string[]): Flag[] {
  const sorted = [...dates].sort();
  const flags: Flag[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const first = sorted[i - 1]!;
    const second = sorted[i]!;
    const days = diffDays(first, second);
    if (days < 2)
      flags.push({ kind: "strength_spacing", severity: "warn", values: { first, second, days } });
  }
  return flags;
}

/**
 * The check-in's status (`wellbeing.ts`): professional help is an alert,
 * a conversation within 14 days a warning (Kolding Talent's model,
 * docs/research/foraeldre-og-talentudvikling.md §1 theme 9, §3.2).
 */
export function wellbeingFlag(status: WellbeingStatus | null | undefined): Flag | null {
  if (!status || status.action === "none" || status.zone === null) return null;
  const values: Record<string, number | string> = {
    zone: status.zone,
    yellowDays: status.yellowDays,
    signs: status.signs.join(","),
  };
  if (status.since) values.since = status.since;
  return status.action === "help"
    ? { kind: "wellbeing_help", severity: "alert", values }
    : { kind: "wellbeing_talk", severity: "warn", values };
}

/**
 * ATK's pain ladder (docs/research/foraeldre-og-talentudvikling.md §2
 * "Overbelastning", §3.3): pain 2 — at the start, hours after and the
 * next morning, cut training by at least half and skip races — is a
 * warning; pain 3 — during and after training, or in everyday life, a
 * pause until a physiotherapist or doctor has looked — an alert. Pain 1,
 * mild soreness, is part of training.
 */
export function painFlag(pain: number | null | undefined): Flag | null {
  if (typeof pain !== "number") return null;
  if (pain >= 3) return { kind: "pain", severity: "alert", values: { pain } };
  if (pain >= 2) return { kind: "pain", severity: "warn", values: { pain } };
  return null;
}

/** Under this a night, Team Danmark cites a raised risk of catching a cold. */
export const SHORT_SLEEP_HOURS = 7;
/** A trend needs this many reported nights; one bad night is not one. */
export const MIN_SLEEP_NIGHTS = 3;

/**
 * The last seven nights' average against the rider's minimum (8–10 hours
 * for 14–17-year-olds, 8–9 for athletes after: the parents' guide theme 8
 * and Team Danmark on sleep, docs/research/foraeldre-og-talentudvikling.md
 * §1, §2 "Søvn", §3.5). Under 7 hours is a warning — the note's own
 * threshold for a lasting trend — and under the minimum worth knowing.
 */
export function sleepFlag(
  nights: readonly (number | null)[],
  minimum: number | null | undefined,
): Flag | null {
  const reported = nights.filter((h): h is number => typeof h === "number" && Number.isFinite(h));
  if (reported.length < MIN_SLEEP_NIGHTS) return null;
  const average = reported.reduce((sum, h) => sum + h, 0) / reported.length;
  const values: Record<string, number> = { average: round1(average), nights: reported.length };
  if (typeof minimum === "number") values.minimum = minimum;
  if (average < SHORT_SLEEP_HOURS)
    return {
      kind: "sleep_short",
      severity: "warn",
      values: { ...values, limit: SHORT_SLEEP_HOURS },
    };
  if (typeof minimum === "number" && average < minimum)
    return { kind: "sleep_below_minimum", severity: "info", values };
  return null;
}

/**
 * Planned against done so far this week: when at least two sessions are
 * red and they are half or more of those that can be judged (grey, not
 * yet due, and unplanned activities do not count), the plan and the week
 * have parted ways — worth knowing, not a fault.
 */
export function complianceFlag(colours: readonly ComplianceColour[]): Flag | null {
  const judged = colours.filter((c) => c === "green" || c === "yellow" || c === "red").length;
  const red = colours.filter((c) => c === "red").length;
  if (red < 2 || red * 2 < judged) return null;
  return { kind: "compliance", severity: "info", values: { red, judged } };
}

const SEVERITY_ORDER: Record<Severity, number> = { alert: 0, warn: 1, info: 2 };

/** Every flag the week raises, the most serious first. */
export function guardrails(input: GuardrailInput): Flag[] {
  const flags = [
    corridorFlag(input.bikeHours, input.corridor),
    rampFlag(input.bikeHours, input.previousWeeksHours ?? []),
    longestRideFlag(input.longestRide, input.longestRideLimit),
    ...strengthSpacingFlags(input.strengthDates ?? []),
    wellbeingFlag(input.wellbeing),
    painFlag(input.latestPain),
    sleepFlag(input.sleepHours ?? [], input.sleepMinimum),
    complianceFlag(input.compliance ?? []),
  ].filter((flag): flag is Flag => flag !== null);
  return flags.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
