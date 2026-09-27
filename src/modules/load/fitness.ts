import { addDaysIso, diffDays, mondayOf } from "@/core/dates";
import type { Sport } from "./activity-load";

/**
 * Fitness, fatigue and form: the load chart's three lines, and the
 * week-by-week totals beside it.
 *
 * The models are the exponentially weighted moving averages widely
 * published in endurance-sport literature, under Kadence's own names:
 *
 * - **fitness** is the 42-day average of daily load — what weeks of
 *   training have built;
 * - **fatigue** is the 7-day average — what the last days have cost;
 * - **form** is yesterday's fitness minus yesterday's fatigue. Taking
 *   yesterday's means the morning's number does not move when today's
 *   ride is uploaded: form is how rested the rider was going into the day.
 *
 * Each average follows x_t = x_{t−1} + (load_t − x_{t−1}) × (1 − e^(−1/N)),
 * the exact daily step of a continuous decay with time constant N days: a
 * day's load has faded to 1/e (37 %) of its weight after N days. The
 * simpler 1/N step is about 7 % larger for N = 7 and 1 % for N = 42; the
 * exponential form was chosen because it says what N means.
 *
 * Days are Copenhagen calendar days as ISO strings; a day without load is
 * a day of 0, and several activities on one day are summed.
 *
 * Pure: imports nothing from the database.
 */

export const FITNESS_DAYS = 42;
export const FATIGUE_DAYS = 7;

export interface DayLoad {
  date: string;
  load: number | null;
}

export interface LoadState {
  fitness: number;
  fatigue: number;
}

export interface LoadDay {
  date: string;
  load: number;
  fitness: number;
  fatigue: number;
  form: number;
}

const FITNESS_STEP = 1 - Math.exp(-1 / FITNESS_DAYS);
const FATIGUE_STEP = 1 - Math.exp(-1 / FATIGUE_DAYS);

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Load per day, several activities on one day summed. */
function dailyTotals(loads: readonly DayLoad[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const { date, load } of loads) {
    if (typeof load !== "number" || !Number.isFinite(load)) continue;
    totals.set(date, (totals.get(date) ?? 0) + load);
  }
  return totals;
}

/**
 * The chart's series, one entry per day from `fromIso` to `toIso`
 * inclusive, values to one decimal.
 *
 * Without a seed, the averages start at 0 on the earliest day that has a
 * load (or on `fromIso`, if that is earlier) and every load up to `toIso`
 * counts, so passing a few months of history before `fromIso` warms the
 * lines up. With a seed — the fitness and fatigue at the end of the day
 * before `fromIso` — the run starts at `fromIso` and earlier loads are
 * ignored, since the seed already holds them.
 */
export function loadSeries(
  loads: readonly DayLoad[],
  fromIso: string,
  toIso: string,
  seed?: LoadState,
): LoadDay[] {
  if (diffDays(fromIso, toIso) < 0) return [];
  const totals = dailyTotals(loads);

  let start = fromIso;
  if (!seed) {
    for (const date of totals.keys()) if (date < start) start = date;
  }
  let fitness = seed?.fitness ?? 0;
  let fatigue = seed?.fatigue ?? 0;

  const out: LoadDay[] = [];
  for (let date = start; date <= toIso; date = addDaysIso(date, 1)) {
    const form = fitness - fatigue;
    const load = totals.get(date) ?? 0;
    fitness += (load - fitness) * FITNESS_STEP;
    fatigue += (load - fatigue) * FATIGUE_STEP;
    if (date >= fromIso) {
      out.push({
        date,
        load: round1(load),
        fitness: round1(fitness),
        fatigue: round1(fatigue),
        form: round1(form),
      });
    }
  }
  return out;
}

export interface WeekActivity {
  date: string;
  /** Moving time. */
  seconds: number;
  load: number | null;
  sport: Sport;
}

export interface WeekTotal {
  /** The Monday the ISO week starts on. */
  monday: string;
  /** All sports, two decimals. */
  hours: number;
  /**
   * On the bike only: DCU's hours count nothing else (the U17 compendium
   * p. 12, docs/research/dcu-traeningsanbefalinger.md §3).
   */
  bikeHours: number;
  /** Whole load units. */
  load: number;
  sessions: number;
}

/**
 * Hours, load and sessions per ISO week (Monday to Sunday). With both
 * `fromIso` and `toIso`, every week from the one holding `fromIso` to the
 * one holding `toIso` is listed, empty weeks included, and activities
 * outside those weeks are left out; without them, only weeks that have
 * activities are listed. Oldest week first.
 */
export function weeklyTotals(
  activities: readonly WeekActivity[],
  fromIso?: string,
  toIso?: string,
): WeekTotal[] {
  const weeks = new Map<
    string,
    { seconds: number; bikeSeconds: number; load: number; sessions: number }
  >();
  const ranged = fromIso !== undefined && toIso !== undefined;
  if (ranged) {
    for (let monday = mondayOf(fromIso); monday <= toIso; monday = addDaysIso(monday, 7)) {
      weeks.set(monday, { seconds: 0, bikeSeconds: 0, load: 0, sessions: 0 });
    }
  }

  for (const activity of activities) {
    const monday = mondayOf(activity.date);
    let week = weeks.get(monday);
    if (!week) {
      if (ranged) continue;
      week = { seconds: 0, bikeSeconds: 0, load: 0, sessions: 0 };
      weeks.set(monday, week);
    }
    const seconds = Number.isFinite(activity.seconds) ? Math.max(0, activity.seconds) : 0;
    week.seconds += seconds;
    if (activity.sport === "bike") week.bikeSeconds += seconds;
    if (typeof activity.load === "number" && Number.isFinite(activity.load))
      week.load += activity.load;
    week.sessions += 1;
  }

  return [...weeks.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([monday, week]) => ({
      monday,
      hours: Math.round((week.seconds / 3600) * 100) / 100,
      bikeHours: Math.round((week.bikeSeconds / 3600) * 100) / 100,
      load: Math.round(week.load),
      sessions: week.sessions,
    }));
}
