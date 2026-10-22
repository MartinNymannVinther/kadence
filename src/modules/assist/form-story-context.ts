import { addDaysIso } from "@/core/dates";
import type { RiderRow } from "@/core/db/schema";
import type { RiderInsight } from "@/modules/insight/rider";
import type { Records } from "@/modules/load";
import type { GoalWithProgress } from "@/modules/training/goals";
import { personaFor } from "./session-comment";
import type { CurvePoint, FormStoryContext, StoryReader, StoryWeek } from "./form-story-prompt";

/**
 * What the model reads for the form story (docs/adr/0108), and only
 * that: a rider's insight, records and goals folded into a few numbers.
 * Ninety days of the curve become five points and two counts; the weeks
 * become the last eight; the records the best over four durations.
 * Nothing a person wrote passes except goal and race titles, capped.
 * Pure: imports nothing from the database.
 */

/** The weeks the story reads: this one and the seven before it. */
export const STORY_WEEKS = 8;
/** The durations a record is read at, in seconds: a minute, five, twenty, an hour. */
export const STORY_RECORD_SECONDS = [60, 300, 1200, 3600] as const;
const TITLE_CHARS = 60;
const round1 = (n: number) => Math.round(n * 10) / 10;

function point(day: { date: string; fitness: number; fatigue: number; form: number } | undefined) {
  if (!day) return null;
  return {
    date: day.date,
    fitness: Math.round(day.fitness),
    fatigue: Math.round(day.fatigue),
    form: Math.round(day.form),
  };
}

function curveOf(insight: RiderInsight, today: string): FormStoryContext["curve"] {
  const series = insight.series;
  const last = series.at(-1);
  const at = (daysAgo: number) => series.find((d) => d.date === addDaysIso(today, -daysAgo));
  const trained = series.filter((d) => d.load > 0);
  const peak = trained.reduce<CurvePoint | null>(
    (best, d) => (!best || d.fitness > best.fitness ? point(d) : best),
    null,
  );
  const lowest = series.reduce<CurvePoint | null>(
    (worst, d) => (!worst || d.form < worst.form ? point(d) : worst),
    null,
  );
  const from28 = addDaysIso(today, -27);
  const from7 = addDaysIso(today, -6);
  return {
    today: point(last),
    fourWeeksAgo: point(at(28)),
    eightWeeksAgo: point(at(56)),
    peakFitness: peak,
    lowestForm: trained.length > 0 ? lowest : null,
    trainingDaysLast28: series.filter((d) => d.date >= from28 && d.load > 0).length,
    restDaysLast7: series.filter((d) => d.date >= from7 && d.load === 0).length,
  };
}

function weeksOf(insight: RiderInsight): StoryWeek[] {
  return insight.weeks.slice(-STORY_WEEKS).map((w) => ({
    monday: w.monday,
    bikeHours: round1(w.bikeHours),
    hours: round1(w.hours),
    sessions: w.sessions,
    ...(w.monday === insight.week.monday
      ? { plannedBikeHours: round1(insight.week.plannedBikeHours) }
      : {}),
  }));
}

function recordsOf(records: {
  byPeriod: { year: Records; month: Records };
}): FormStoryContext["records"] {
  const power = (r: Records) =>
    r.power
      .filter((p) => (STORY_RECORD_SECONDS as readonly number[]).includes(p.seconds))
      .map((p) => ({ seconds: p.seconds, watts: Math.round(p.watts), date: p.onDate }));
  const year = records.byPeriod.year;
  return {
    thisYear: power(year),
    thisMonth: power(records.byPeriod.month),
    longestKm: year.longestKm
      ? { value: Math.round(year.longestKm.value), date: year.longestKm.onDate }
      : null,
    longestHours: year.longestHours
      ? { value: round1(year.longestHours.value), date: year.longestHours.onDate }
      : null,
  };
}

export function formStoryContext(input: {
  rider: Pick<
    RiderRow,
    | "birthYear"
    | "categoryOverride"
    | "trainingProfile"
    | "ftpWatts"
    | "thresholdHr"
    | "maxHr"
    | "restingHr"
    | "thresholdsOn"
  >;
  insight: RiderInsight;
  records: { byPeriod: { year: Records; month: Records } };
  goals: readonly GoalWithProgress[];
  today: string;
  reader: StoryReader;
}): FormStoryContext {
  const { rider, insight, today } = input;
  const forecast = input.insight.forecast;
  const end = forecast?.days.at(-1);
  const raceDay = forecast?.race ? forecast.days.find((d) => d.date === forecast.race!.date) : null;
  return {
    reader: input.reader,
    ...personaFor(rider, today),
    today,
    curve: curveOf(insight, today),
    weeks: weeksOf(insight),
    // DCU's October has no range: a 0–0 range would read as a floor.
    range:
      insight.corridor && insight.corridor.high > 0
        ? {
            low: insight.corridor.low,
            target: insight.corridor.target,
            high: insight.corridor.high,
            source: insight.guidance,
          }
        : null,
    forecast:
      forecast && end
        ? {
            days: forecast.days.length,
            end: point(end)!,
            race:
              forecast.race && raceDay
                ? {
                    title: forecast.race.title.slice(0, TITLE_CHARS),
                    date: forecast.race.date,
                    priority: forecast.race.priority,
                    form: Math.round(raceDay.form),
                  }
                : null,
          }
        : null,
    attention: insight.flags.map((f) => ({
      kind: f.kind,
      severity: f.severity,
      values: f.values,
    })),
    wellbeing: insight.wellbeing
      ? { zone: insight.wellbeing.zone, yellowDaysLast21: insight.wellbeing.yellowDays }
      : null,
    thresholds: {
      ftpWatts: rider.ftpWatts,
      thresholdHr: rider.thresholdHr,
      maxHr: rider.maxHr,
      restingHr: rider.restingHr,
      setOn: rider.thresholdsOn,
    },
    records: recordsOf(input.records),
    goals: input.goals.map((g) => ({
      title: g.title.slice(0, TITLE_CHARS),
      kind: g.kind,
      target: g.target,
      done: g.done,
      startsOn: g.startsOn,
      endsOn: g.endsOn,
    })),
  };
}
