import { addDaysIso, mondayOf } from "@/core/dates";
import type { CheckinRow, RiderRow } from "@/core/db/schema";
import { seasonStartYear, type WeeklyCorridor } from "@/modules/dcu";
import { DCU_2025, profileFor, type GuidanceId, type Paradigm } from "@/modules/paradigms";
import {
  MID_ZONE_WEEKS,
  compliance,
  countIntensity,
  forecastForm,
  guardrails,
  loadSeries,
  splitResolved,
  weeklyTotals,
  wellbeingStatus,
  type ComplianceColour,
  type Flag,
  type FlagKind,
  type Forecast,
  type IntensityRace,
  type IntensitySession,
  type LoadDay,
  type ResolvedFlag,
  type Severity,
  type WeekTotal,
  type WellbeingStatus,
} from "@/modules/load";
import { riderClass } from "@/modules/season/class";
import type { InsightActivity, InsightRace, InsightSession } from "./gather";

/**
 * One rider's week and season at a glance, from rows already read: the
 * load curve (fitness, fatigue, form), the weeks' hours against DCU's
 * corridor, the guardrails, and the wellbeing status. Pure — the
 * database work is in gather.ts — so it is tested on its own.
 */

export const SERIES_DAYS = 90;
/** Days read before the series starts, so fitness has warmed up by its first day. */
export const WARMUP_DAYS = 120;

/** A coach's "afklaret" this week, as the row's key (ADR 0026). */
export type InsightResolution = {
  id: string;
  kind: FlagKind;
  severity: Severity;
  seen: Flag["values"][];
};

export type RiderInsight = {
  riderId: string;
  name: string;
  category: string;
  basis: string | null;
  /** The paradigm the team plans by (ADR 0049); "none" without one. */
  guidance: GuidanceId;
  week: { monday: string; plannedHours: number; plannedBikeHours: number; total: WeekTotal | null };
  corridor: WeeklyCorridor | null;
  series: LoadDay[];
  weeks: WeekTotal[];
  /** The week's open flags, the most serious first. */
  flags: Flag[];
  /** This week's flags a coach has marked afklaret and that still fire; `flags` holds the open ones. */
  resolved: ResolvedFlag<InsightResolution>[];
  wellbeing: WellbeingStatus | null;
  today: LoadDay | null;
  /** Form ahead if the plan is ridden, to the next A/B race (src/modules/load/forecast.ts). */
  forecast: Forecast | null;
};

const hours = (seconds: number) => seconds / 3600;

export function riderInsight(
  rider: RiderRow,
  acts: InsightActivity[],
  sessions: InsightSession[],
  checks: CheckinRow[],
  todayIso: string,
  wellbeingVisible: boolean,
  races: readonly InsightRace[] = [],
  resolutions: readonly InsightResolution[] = [],
  /** The team's paradigm (ADR 0049); null leaves the corridor and the longest ride out. */
  paradigm: Paradigm | null = DCU_2025,
  /**
   * The planned bike sessions and races of the last four weeks, when the
   * team uses "Lav intensitet først" (ADR 0053); null leaves its flag out.
   */
  intensity: { sessions: IntensitySession[]; races: IntensityRace[] } | null = null,
): RiderInsight {
  const monday = mondayOf(todayIso);
  const sunday = addDaysIso(monday, 6);
  const klass = riderClass(rider, seasonStartYear(todayIso));
  const corridor = paradigm && klass.basis ? paradigm.weeklyCorridor(klass.basis, monday) : null;

  const from = addDaysIso(todayIso, -(SERIES_DAYS + WARMUP_DAYS));
  const all = loadSeries(
    acts.map((a) => ({ date: a.onDate, load: a.load ?? 0 })),
    from,
    todayIso,
  );
  const series = all.slice(-SERIES_DAYS);
  const weeks = weeklyTotals(
    acts.map((a) => ({ date: a.onDate, seconds: a.seconds, load: a.load, sport: a.sport })),
    addDaysIso(monday, -7 * 11),
    sunday,
  );
  const thisWeek = weeks.find((w) => w.monday === monday) ?? null;
  const previous = weeks
    .filter((w) => w.monday < monday)
    .slice(-4)
    .map((w) => w.bikeHours);

  const weekActs = acts.filter((a) => a.onDate >= monday && a.onDate <= sunday);
  const weekSessions = sessions.filter((s) => s.onDate >= monday && s.onDate <= sunday);
  const openPlanned = weekSessions.filter((s) => !s.activityId && s.onDate >= todayIso);
  const plannedBike = openPlanned.filter((s) => s.sport === "bike");
  const longest = weekActs
    .filter((a) => a.sport === "bike")
    .reduce<{ hours: number; km: number | null } | null>((best, a) => {
      const h = hours(a.seconds);
      return !best || h > best.hours
        ? { hours: h, km: a.distanceM === null ? null : a.distanceM / 1000 }
        : best;
    }, null);
  const strengthDates = acts
    .filter(
      (a) => a.sport === "strength" && a.onDate >= addDaysIso(monday, -3) && a.onDate <= sunday,
    )
    .map((a) => a.onDate);

  const actById = new Map(acts.map((a) => [a.id, a]));
  const colours: ComplianceColour[] = weekSessions
    .filter((s) => s.onDate <= todayIso)
    .map((s) => {
      const done = s.activityId
        ? acts.find((a) => a.onDate === s.onDate && a.sport === s.sport)
        : undefined;
      if (done) actById.set(s.activityId!, done);
      return compliance(
        { minutes: s.plannedMinutes, load: s.plannedLoad },
        done ? { minutes: done.seconds / 60, load: done.load } : null,
        s.onDate,
        todayIso,
      );
    });

  const byDate: Record<string, CheckinRow> = {};
  for (const c of checks) byDate[c.onDate] = c;
  const wellbeing =
    wellbeingVisible && checks.length > 0 ? wellbeingStatus(byDate, todayIso) : null;
  const lastSeven = Array.from(
    { length: 7 },
    (_, i) => byDate[addDaysIso(todayIso, -i)]?.sleepHours ?? null,
  );
  const age = Number(todayIso.slice(0, 4)) - rider.birthYear;
  const latest = checks.at(-1);
  const profile = intensity ? profileFor(Number(todayIso.slice(5, 7))) : null;
  const windowFrom = addDaysIso(monday, -7 * (MID_ZONE_WEEKS - 1));

  const flags = guardrails({
    bikeHours:
      (thisWeek?.bikeHours ?? 0) + plannedBike.reduce((s, p) => s + p.plannedMinutes / 60, 0),
    corridor,
    previousWeeksHours: previous,
    longestRide: longest,
    longestRideLimit:
      paradigm && (klass.category === "U17" || klass.category === "U19" || klass.category === "U23")
        ? paradigm.longestRide(klass.category)
        : null,
    strengthDates,
    wellbeing,
    latestPain: wellbeingVisible ? (latest?.pain ?? null) : null,
    sleepHours: wellbeingVisible ? lastSeven : [],
    sleepMinimum: age < 18 ? 8 : null,
    compliance: colours,
    intensity:
      intensity && profile
        ? {
            count: countIntensity(intensity.sessions, intensity.races, windowFrom, sunday),
            midMax: profile.midMax,
          }
        : null,
  });
  const { open, resolved } = splitResolved(flags, resolutions);

  return {
    riderId: rider.id,
    name: rider.name,
    category: klass.category,
    basis: klass.basis,
    guidance: paradigm?.id ?? "none",
    week: {
      monday,
      plannedHours: openPlanned.reduce((s, p) => s + p.plannedMinutes / 60, 0),
      plannedBikeHours: plannedBike.reduce((s, p) => s + p.plannedMinutes / 60, 0),
      total: thisWeek,
    },
    corridor,
    series,
    weeks,
    flags: open,
    resolved,
    wellbeing,
    today: series.at(-1) ?? null,
    forecast: forecastAhead(series.at(-1) ?? null, sessions, races, todayIso),
  };
}

/** Form ahead from the end of today, over the open planned sessions. */
function forecastAhead(
  last: LoadDay | null,
  sessions: InsightSession[],
  races: readonly InsightRace[],
  todayIso: string,
): Forecast | null {
  if (!last) return null;
  return forecastForm(
    todayIso,
    { fitness: last.fitness, fatigue: last.fatigue },
    sessions.filter((s) => !s.activityId),
    races.map((r) => ({ title: r.title, date: r.startsOn, priority: r.priority })),
  );
}
