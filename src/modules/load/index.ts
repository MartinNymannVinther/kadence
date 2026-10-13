/**
 * Load, zones and guardrails: the numbers behind the load chart, the
 * calendar's colours, the check-in's zones and the coach's warnings.
 * Pure logic, importing nothing from the database; the services feed it
 * rows and DCU's numbers and store or show what it returns.
 *
 * Kadence's own words throughout: load, weighted power, intensity,
 * fitness, fatigue and form.
 */

export {
  LOAD_PER_HOUR_AT_THRESHOLD,
  RPE_AT_THRESHOLD,
  RPE_EXPONENT,
  loadAt,
  rpeIntensity,
  rpeLoad,
  rpeLoadPerHour,
  sessionRpe,
} from "./calibration";
export {
  timeInZones,
  targetRange,
  zoneForHr,
  zoneForPower,
  type TargetRange,
  type Thresholds,
  type ZoneSeconds,
} from "./zones";
export {
  BEST_POWER_SECONDS,
  POWER_CURVE_SECONDS,
  WEIGHTED_POWER_WINDOW,
  bestMeanPower,
  bestMeanPowers,
  powerCurve,
  weightedPower,
  type BestPowerSeconds,
} from "./weighted-power";
export { DRIFT_MIN_SECONDS, heartRateDrift } from "./drift";
export {
  expandPlan,
  planVsRide,
  type PlanVsRide,
  type PlannedStep,
  type StepResult,
  type Verdict,
} from "./plan-vs-ride";
export {
  PERIOD_DAYS,
  PERIODS,
  bestCurve,
  inPeriod,
  records,
  recordsSetBy,
  type Period,
  type PowerRecord,
  type RecordSource,
  type Records,
  type RideRecord,
} from "./records";
export {
  DEFAULT_DAYS as FORECAST_DEFAULT_DAYS,
  MAX_DAYS as FORECAST_MAX_DAYS,
  forecastForm,
  plannedDayLoad,
  type Forecast,
  type ForecastRace,
  type PlannedDay,
} from "./forecast";
export {
  HR_RATIO_CAP,
  HR_RATIO_FLOOR,
  activityLoad,
  type ActivityLoad,
  type ActivityLoadInput,
  type LoadMethod,
  type Sport,
} from "./activity-load";
export {
  OPEN_INTENSITY,
  OTHER_RPE,
  STRENGTH_RPE,
  hrPctToFtpPct,
  plannedLoad,
  targetIntensity,
  zoneIntensity,
} from "./planned-load";
export {
  FATIGUE_DAYS,
  FITNESS_DAYS,
  loadSeries,
  weeklyTotals,
  type DayLoad,
  type LoadDay,
  type LoadState,
  type WeekActivity,
  type WeekTotal,
} from "./fitness";
export {
  GREEN_HIGH_PCT,
  GREEN_LOW_PCT,
  RPE_FAR_HIGH_PCT,
  RPE_FAR_LOW_PCT,
  YELLOW_HIGH_PCT,
  YELLOW_LOW_PCT,
  colourOfPct,
  compliance,
  complianceRatio,
  feltFarOff,
  matchActivity,
  type ComplianceColour,
  type ComplianceRatio,
  type ComplianceSide,
  type MatchCandidate,
} from "./compliance";
export {
  builtAround,
  deviation,
  plannedZoneSeconds,
  type Deviation,
  type DeviationDone,
  type DeviationFact,
  type DeviationHeading,
  type DeviationPlanned,
  type ZoneSecondsBySource,
} from "./deviation";
export {
  HINT_MIN_MINUTES,
  HINT_POWER_INTENSITY,
  intensityOfLoad,
  type DeviationStory,
  type Effort,
  type PlanCharacter,
  type TimeDirection,
} from "./deviation-story";
export {
  LOW_AVERAGE,
  SHORT_NIGHT_HOURS,
  WELLBEING_WINDOW_DAYS,
  checkinZone,
  isRedCheckin,
  wellbeingStatus,
  type Checkin,
  type CheckinZone,
  type WellbeingAction,
  type WellbeingSign,
  type WellbeingStatus,
  type WellbeingZone,
} from "./wellbeing";
export {
  FLAG_KINDS,
  MIN_SLEEP_NIGHTS,
  RAMP_LIMIT_PCT,
  RAMP_MIN_HOURS,
  SEVERITIES,
  SHORT_SLEEP_HOURS,
  TRAINING_KINDS,
  WELLBEING_KINDS,
  complianceFlag,
  corridorFlag,
  guardrails,
  longestRideFlag,
  painFlag,
  rampFlag,
  sleepFlag,
  strengthSpacingFlags,
  wellbeingFlag,
  type Corridor,
  type Flag,
  type FlagKind,
  type GuardrailInput,
  type RideLimit,
  type Severity,
} from "./guardrails";
export {
  GOAL_SECONDS,
  THREE_ZONES,
  countIntensity,
  counted,
  intensityShares,
  sessionGoal,
  stepZone,
  threeZoneOf,
  weeklyIntensity,
  type IntensityCount,
  type IntensityRace,
  type IntensitySession,
  type ThreeZone,
} from "./intensity";
export {
  MID_ZONE_GIVE,
  MID_ZONE_MIN_SESSIONS,
  MID_ZONE_WEEKS,
  midZoneFlag,
  type MidZoneInput,
} from "./intensity-flag";
export {
  MATERIAL_STEP,
  splitResolved,
  worseThan,
  type ResolutionKey,
  type ResolvedFlag,
} from "./resolved";
