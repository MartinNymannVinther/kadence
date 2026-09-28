import { addDaysIso, diffDays } from "@/core/dates";
import { rpeLoad } from "./calibration";
import { loadSeries, type LoadDay, type LoadState } from "./fitness";
import { OTHER_RPE, STRENGTH_RPE } from "./planned-load";

/**
 * Where fitness, fatigue and form are heading if the rider rides what is
 * planned: the same model as the chart (`fitness.ts`), started from the
 * end of today and fed the open planned sessions' load, up to the next A
 * or B race — or, without one, `DEFAULT_DAYS` ahead. Never more than
 * `MAX_DAYS`: a plan further out is too loose to project.
 *
 * Shown to plan with, never set as a target (ADR 0013, process before
 * results): the coach sees what the plan does to form on race day, and
 * decides.
 *
 * A planned session without an estimated load counts by its minutes at an
 * assumed effort — endurance for a ride, DCU's strength effort, "other"
 * for the rest — so a plan typed in without structure is not a plan of
 * nothing.
 *
 * Pure: imports nothing from the database.
 */

export const MAX_DAYS = 56;
export const DEFAULT_DAYS = 14;
/** The effort a planned ride without structure is taken to have: steady endurance. */
export const UNSTRUCTURED_RIDE_RPE = 4;

export type PlannedDay = {
  onDate: string;
  sport: string;
  plannedMinutes: number;
  plannedLoad: number | null;
};

export type ForecastRace = { title: string; date: string; priority: "A" | "B" };

export type Forecast = { days: LoadDay[]; race: ForecastRace | null };

export function plannedDayLoad(session: PlannedDay): number {
  if (session.plannedLoad !== null && session.plannedLoad >= 0) return session.plannedLoad;
  const rpe =
    session.sport === "strength"
      ? STRENGTH_RPE
      : session.sport === "bike"
        ? UNSTRUCTURED_RIDE_RPE
        : OTHER_RPE;
  return rpeLoad(session.plannedMinutes, rpe);
}

export function forecastForm(
  today: string,
  endOfToday: LoadState,
  planned: readonly PlannedDay[],
  races: readonly ForecastRace[],
): Forecast {
  const tomorrow = addDaysIso(today, 1);
  const race =
    [...races]
      .filter((r) => r.date >= tomorrow && diffDays(today, r.date) <= MAX_DAYS)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  const until = race?.date ?? addDaysIso(today, DEFAULT_DAYS);
  const days = loadSeries(
    planned
      .filter((p) => p.onDate >= tomorrow && p.onDate <= until)
      .map((p) => ({ date: p.onDate, load: plannedDayLoad(p) })),
    tomorrow,
    until,
    endOfToday,
  );
  return { days, race };
}
