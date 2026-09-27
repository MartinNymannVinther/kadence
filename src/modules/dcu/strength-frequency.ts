import type { DcuCategory } from "./classes";

/**
 * How often DCU's strength programmes are trained, by the time of year.
 * All three programmes give the same two periods
 * (DCU_U17_styrketraening.pdf p. 2; DCU_U19_styrketraening.pdf p. 2;
 * DCU_U23_styrketraening.pdf p. 1):
 * - **build**, "Start november – medio marts": 2-3 sessions a week, with
 *   "minimum 48 timer imellem hvert styrketræningspas";
 * - **maintenance**, "Medio marts – start november": 1 session a week.
 *
 * "Medio marts" is read as the 15th: the build runs 1 November to
 * 15 March inclusive, maintenance from 16 March. The compendia end the
 * winter's course earlier, "senest omkring 1. marts"
 * (DCU_U17_kompendium_2016.pdf p. 16; DCU_U19_kompendium_2016.pdf p. 20);
 * the programmes win, as CLAUDE.md decides. So does their one session a
 * week in the season, which U17's in-season example week leaves out
 * (DCU_U17_kompendium_2016.pdf p. 14). The 48 hours are stated for
 * the build; with one session a week they hold by themselves, and
 * Kadence keeps them all year as the guardrail's minimum.
 *
 * Pure: imports nothing from the database.
 */

export type StrengthPeriod = "build" | "maintenance";

export type StrengthFrequency = {
  period: StrengthPeriod;
  perWeekMin: number;
  perWeekMax: number;
  minHoursBetween: number;
};

/** "minimum 48 timer imellem hvert styrketræningspas" (DCU_U17_styrketraening.pdf p. 2) */
export const MIN_HOURS_BETWEEN_STRENGTH = 48;

/** The build's last day, "medio marts" read as 15 March (programmes p. 2, U23 p. 1). */
export const BUILD_ENDS = { month: 3, day: 15 } as const;

/** The build's first day, "start november" (programmes p. 2, U23 p. 1). */
export const BUILD_STARTS = { month: 11, day: 1 } as const;

const PER_WEEK: Record<StrengthPeriod, { min: number; max: number }> = {
  build: { min: 2, max: 3 }, // "2-3 styrketræningspas/uge", DCU_U17_styrketraening.pdf p. 2
  maintenance: { min: 1, max: 1 }, // "1 styrketræningspas/uge", DCU_U17_styrketraening.pdf p. 2
};

/**
 * At least 30 sessions a winter (DCU_U17_kompendium_2016.pdf p. 15-16;
 * DCU_U19_kompendium_2016.pdf p. 20, 22), or the course is not worth
 * starting: "Er det ikke muligt, anbefales det, at du slet ikke
 * påbegynder et forløb" (DCU_U17_kompendium_2016.pdf p. 15). U23 has no
 * compendium and no minimum.
 */
export const MIN_WINTER_SESSIONS = 30;

export const MIN_WINTER_SESSIONS_BY_CATEGORY: Record<DcuCategory, number | null> = {
  U17: MIN_WINTER_SESSIONS,
  U19: MIN_WINTER_SESSIONS,
  U23: null,
};

/** The strength period a date (yyyy-mm-dd) falls in. */
export function strengthPeriod(dateIso: string): StrengthPeriod {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(dateIso);
  if (!match) throw new RangeError(`Not an ISO date: ${dateIso}`);
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month >= BUILD_STARTS.month) return "build";
  if (month < BUILD_ENDS.month) return "build";
  if (month === BUILD_ENDS.month && day <= BUILD_ENDS.day) return "build";
  return "maintenance";
}

/** How many strength sessions a week DCU recommends on a date, and the least time between them. */
export function strengthFrequency(dateIso: string): StrengthFrequency {
  const period = strengthPeriod(dateIso);
  const { min, max } = PER_WEEK[period];
  return {
    period,
    perWeekMin: min,
    perWeekMax: max,
    minHoursBetween: MIN_HOURS_BETWEEN_STRENGTH,
  };
}
