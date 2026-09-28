import { addDaysIso, mondayOf } from "@/core/dates";
import type { CheckinRow, RiderRow } from "@/core/db/schema";
import { LONGEST_RIDE, seasonStartYear, weeklyCorridor, type WeeklyCorridor } from "@/modules/dcu";
import {
  compliance,
  forecastForm,
  guardrails,
  loadSeries,
  weeklyTotals,
  wellbeingStatus,
  type ComplianceColour,
  type Flag,
  type Forecast,
  type LoadDay,
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

export type RiderInsight = {
  riderId: string;
  name: string;
  category: string;
  basis: string | null;
  week: { monday: string; plannedHours: number; plannedBikeHours: number; total: WeekTotal | null };
  corridor: WeeklyCorridor | null;
  series: LoadDay[];
  weeks: WeekTotal[];
  flags: Flag[];
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
): RiderInsight {
  const monday = mondayOf(todayIso);
  const sunday = addDaysIso(monday, 6);
  const klass = riderClass(rider, seasonStartYear(todayIso));
  const corridor = klass.basis ? weeklyCorridor(klass.basis, monday) : null;

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

  const flags = guardrails({
    bikeHours:
      (thisWeek?.bikeHours ?? 0) + plannedBike.reduce((s, p) => s + p.plannedMinutes / 60, 0),
    corridor,
    previousWeeksHours: previous,
    longestRide: longest,
    longestRideLimit:
      klass.category === "U17" || klass.category === "U19" || klass.category === "U23"
        ? LONGEST_RIDE[klass.category]
        : null,
    strengthDates,
    wellbeing,
    latestPain: wellbeingVisible ? (latest?.pain ?? null) : null,
    sleepHours: wellbeingVisible ? lastSeven : [],
    sleepMinimum: age < 18 ? 8 : null,
    compliance: colours,
  });

  return {
    riderId: rider.id,
    name: rider.name,
    category: klass.category,
    basis: klass.basis,
    week: {
      monday,
      plannedHours: openPlanned.reduce((s, p) => s + p.plannedMinutes / 60, 0),
      plannedBikeHours: plannedBike.reduce((s, p) => s + p.plannedMinutes / 60, 0),
      total: thisWeek,
    },
    corridor,
    series,
    weeks,
    flags,
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
