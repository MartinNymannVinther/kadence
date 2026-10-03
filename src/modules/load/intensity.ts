import { addDaysIso } from "@/core/dates";
import { flattenSteps, type Step, type Structure, type Zone } from "@/modules/workouts/structure";
import { targetIntensity } from "./planned-load";
import { zoneForPower } from "./zones";

/**
 * How a week's sessions spread over three zones: low, between the
 * thresholds, and high (docs/adr/0053; docs/research/traeningsparadigmer.md,
 * section 3 and 8.2).
 *
 * **Counted by the session's goal, not by the clock.** Each planned bike
 * session is one session in the zone it is meant for, as Seiler counts
 * them (Seiler & Kjerland 2006; Seiler 2010, "ca. 80/20, talt i pas") and
 * as Olympiatoppen asks a whole interval to be logged in its planned zone.
 * A session's goal is the highest zone it holds for at least five minutes
 * in all — 4 × 4 minutes at VO2 max is a hard session, though most of its
 * hour is easy — and, when no zone reaches five minutes, the zone it
 * spends longest in.
 *
 * **A race day is one hard session**, whatever else is planned that day:
 * youth and junior road races spend a large share above the second
 * threshold (Rodríguez-Marroyo et al. 2011: 40.2 % in one-day races;
 * Gallo et al. 2022). Strength and other sports are not counted.
 *
 * Kadence's seven zones fold into three as 1–2 low, 3–4 between and 5–7
 * high. That is Kadence's approximation, not a source's: the first
 * threshold sits at no fixed share of threshold power (section 8.2).
 *
 * Pure: imports nothing from the database.
 */

export const THREE_ZONES = ["low", "mid", "high"] as const;
export type ThreeZone = (typeof THREE_ZONES)[number];

/** Five minutes in a zone makes it the session's goal (see the file comment). */
export const GOAL_SECONDS = 5 * 60;

/** Kadence's seven zones folded into three. */
export function threeZoneOf(zone: Zone): ThreeZone {
  return zone <= 2 ? "low" : zone <= 4 ? "mid" : "high";
}

/**
 * The zone a step is meant for, read from its target the way the load
 * model reads it. An open work step ("all out", "race it") says nothing
 * about which zone, so it counts nowhere; an open easy step is easy.
 */
export function stepZone(step: Step): Zone | null {
  if (step.target.kind === "zone") return step.target.zone as Zone;
  if (step.target.kind === "open" && step.intent === "work") return null;
  return zoneForPower(targetIntensity(step.target, step.intent) * 100, 100);
}

/** The zone a session is meant for, or null for a session that says none (or is not on the bike). */
export function sessionGoal(structure: Structure): ThreeZone | null {
  if (structure.kind !== "bike") return null;
  const seconds: Record<ThreeZone, number> = { low: 0, mid: 0, high: 0 };
  for (const step of flattenSteps(structure)) {
    const zone = stepZone(step);
    if (zone !== null) seconds[threeZoneOf(zone)] += step.seconds;
  }
  const highest = [...THREE_ZONES].reverse().find((z) => seconds[z] >= GOAL_SECONDS);
  if (highest) return highest;
  const longest = THREE_ZONES.reduce((best, z) => (seconds[z] > seconds[best] ? z : best), "low");
  return seconds[longest] > 0 ? longest : null;
}

export type IntensitySession = { onDate: string; structure: Structure };
export type IntensityRace = { startsOn: string; endsOn: string };

export type IntensityCount = Record<ThreeZone, number> & {
  /** Race days among the high ones. */
  races: number;
  /** Bike sessions whose goal cannot be read; shown, not counted. */
  unknown: number;
};

const empty = (): IntensityCount => ({ low: 0, mid: 0, high: 0, races: 0, unknown: 0 });

/** The days of a race that fall within [from, to]. */
function raceDays(race: IntensityRace, from: string, to: string): string[] {
  const days: string[] = [];
  const start = race.startsOn > from ? race.startsOn : from;
  const end = race.endsOn < to ? race.endsOn : to;
  for (let d = start; d <= end; d = addDaysIso(d, 1)) days.push(d);
  return days;
}

/** The sessions and race days from `from` to `to`, both inclusive. */
export function countIntensity(
  sessions: readonly IntensitySession[],
  races: readonly IntensityRace[],
  from: string,
  to: string,
): IntensityCount {
  const count = empty();
  for (const s of sessions) {
    if (s.onDate < from || s.onDate > to || s.structure.kind !== "bike") continue;
    const goal = sessionGoal(s.structure);
    if (goal) count[goal] += 1;
    else count.unknown += 1;
  }
  const days = new Set(races.flatMap((r) => raceDays(r, from, to)));
  count.high += days.size;
  count.races = days.size;
  return count;
}

/** The sessions that are counted: low, between and high. */
export function counted(count: IntensityCount): number {
  return count.low + count.mid + count.high;
}

/** Each zone's share of the counted sessions in whole percent; null with none counted. */
export function intensityShares(count: IntensityCount): Record<ThreeZone, number> | null {
  const total = counted(count);
  if (total === 0) return null;
  const pct = (n: number) => Math.round((100 * n) / total);
  return { low: pct(count.low), mid: pct(count.mid), high: pct(count.high) };
}

/** Each Monday-week's count, for the weeks starting on the given Mondays. */
export function weeklyIntensity(
  sessions: readonly IntensitySession[],
  races: readonly IntensityRace[],
  mondays: readonly string[],
): { monday: string; count: IntensityCount }[] {
  return mondays.map((monday) => ({
    monday,
    count: countIntensity(sessions, races, monday, addDaysIso(monday, 6)),
  }));
}
