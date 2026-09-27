/**
 * Cycling Denmark's (DCU's) training recommendations as data and pure
 * functions: age classes, the 2025 hours and the weekly corridor, the
 * season's phases, the strength programmes and how often to train them,
 * and the season plan with its deviation from DCU (ADR 0014). Every
 * number names its source document and page; `sources.ts` lists them.
 *
 * Pure: imports nothing from the database.
 */

export {
  CLASS_AGES,
  CLASS_BASES,
  SEASON_MONTHS,
  SEASON_START_MONTH,
  ageInRaceYear,
  basisParts,
  classFor,
  isClassBasis,
  raceYearOf,
  seasonStartYear,
  type Category,
  type ClassBasis,
  type DcuCategory,
  type RiderClass,
} from "./classes";
export {
  CORRIDOR_BAND,
  DCU_HOURS_2025,
  DCU_TOTALS_2025,
  monthHours,
  seasonHours,
  weeklyCorridor,
  type WeeklyCorridor,
} from "./hours";
export {
  COUNTS_TOWARD_DCU_HOURS,
  LONGEST_RIDE,
  U19_SEASON_MONTHLY_HOURS,
  VOLUME_RULES,
  exceedsLongestRide,
  type LongestRide,
  type VolumeRule,
} from "./rules";
export { MONTH_NOTES, PHASES, PHASE_INFO, phaseOf, type Phase, type PhaseInfo } from "./phases";
export {
  DCU_HRR_BANDS,
  EXAMPLE_WEEK_TERMS,
  INTENSITY_SHARE_BY_MONTH,
  INTERVAL_FORMS,
  type IntensityTerm,
  type IntervalForm,
} from "./intensity";
export { STRENGTH_PROGRAMMES, type StrengthProgramme } from "./strength";
export {
  BUILD_ENDS,
  BUILD_STARTS,
  MIN_HOURS_BETWEEN_STRENGTH,
  MIN_WINTER_SESSIONS,
  MIN_WINTER_SESSIONS_BY_CATEGORY,
  strengthFrequency,
  strengthPeriod,
  type StrengthFrequency,
  type StrengthPeriod,
} from "./strength-frequency";
export {
  buildSeasonPlan,
  compareToDcu,
  type MonthDeviation,
  type SeasonPlan,
  type SeasonPlanMonth,
} from "./season";
export { DCU_SOURCES, type DcuSource, type DcuSourceId } from "./sources";
