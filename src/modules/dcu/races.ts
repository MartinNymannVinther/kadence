import type { DcuCategory } from "./classes";

/**
 * What DCU allows in a race, by class: the longest road race and time
 * trial, the biggest gear, and the most days a stage race may last. The
 * numbers are DCU's sporting rules 2026 (Sporstlige_regler_2026, "Endelig
 * version" of 17 February 2026), chapter 7 for road racing and § 23.4 for
 * stage races; the youth rules are unchanged from 2025. Checked against
 * the PDF's text on 27 September 2026.
 *
 * Kadence's classes do not split by sex; DCU's U19 does (U19D men, U19P
 * women), so a U19 rule is looked up with the rider's sex, and without it
 * both are shown. U23 riders race in the senior classes, which set no
 * youth limits beyond the stage-race days.
 *
 * Shown to the coach before a race and given to the AI as context — never
 * enforced: entering a race is the organiser's business.
 *
 * Pure: imports nothing from the database.
 */

export type RaceRules = {
  /** Longest one-day road race, km; null when DCU sets none for the class. */
  roadMaxKm: number | null;
  /** Shortest one-day road race, km, where DCU sets one. */
  roadMinKm: number | null;
  timeTrialMaxKm: number | null;
  /** Metres per pedal revolution; null when there is no limit. */
  gearingM: number | null;
  stageRaceMaxDays: number;
  source: string;
};

const RULES = "Sporstlige_regler_2026";

export const RACE_RULES: {
  U17: RaceRules;
  U19: { men: RaceRules; women: RaceRules };
  U23: RaceRules;
} = {
  U17: {
    roadMaxKm: 80,
    roadMinKm: null,
    timeTrialMaxKm: 15,
    gearingM: 7.33,
    stageRaceMaxDays: 4,
    source: `${RULES} ch. 7 § 1.15-3 and 1.15-4 (PDF p. 38); § 23.4-1 (PDF p. 47)`,
  },
  U19: {
    men: {
      roadMaxKm: 140,
      roadMinKm: 90,
      timeTrialMaxKm: 30,
      gearingM: null,
      stageRaceMaxDays: 4,
      source: `${RULES} ch. 7 § 1.6-5 and 1.6-6 (PDF p. 35); § 23.4-2 (PDF p. 47)`,
    },
    women: {
      roadMaxKm: 95,
      roadMinKm: 60,
      timeTrialMaxKm: 30,
      gearingM: null,
      stageRaceMaxDays: 4,
      source: `${RULES} ch. 7 § 1.14-5 and 1.14-6 (PDF p. 38); § 23.4-2 (PDF p. 47)`,
    },
  },
  U23: {
    roadMaxKm: null,
    roadMinKm: null,
    timeTrialMaxKm: null,
    gearingM: null,
    stageRaceMaxDays: 5,
    source: `${RULES} § 23.4-3 (PDF p. 47)`,
  },
};

/**
 * The rules for a rider's class. For U19 without a known sex, the men's
 * rules — the longer distances — so a coach is never told a race is too
 * long when it is not; the guide shows both.
 */
export function raceRulesFor(category: DcuCategory, sex?: string | null): RaceRules {
  if (category === "U19") return sex === "female" ? RACE_RULES.U19.women : RACE_RULES.U19.men;
  return RACE_RULES[category];
}

/** Days a race from `startsOn` to `endsOn` lasts, both counted (ISO dates). */
export function raceDays(startsOn: string, endsOn: string): number {
  const ms = Date.parse(`${endsOn}T00:00:00Z`) - Date.parse(`${startsOn}T00:00:00Z`);
  return Number.isFinite(ms) ? Math.max(1, Math.round(ms / 86_400_000) + 1) : 1;
}

/** True when a stage race lasts longer than DCU allows the class. */
export function stageRaceTooLong(
  category: DcuCategory,
  race: { startsOn: string; endsOn: string },
): boolean {
  return raceDays(race.startsOn, race.endsOn) > raceRulesFor(category).stageRaceMaxDays;
}
