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
  compliance,
  matchActivity,
  type ComplianceColour,
  type ComplianceSide,
  type MatchCandidate,
} from "./compliance";
export {
  LOW_AVERAGE,
  SHORT_NIGHT_HOURS,
  WELLBEING_WINDOW_DAYS,
  checkinZone,
  wellbeingStatus,
  type Checkin,
  type CheckinZone,
  type WellbeingAction,
  type WellbeingSign,
  type WellbeingStatus,
  type WellbeingZone,
} from "./wellbeing";
export {
  MIN_SLEEP_NIGHTS,
  RAMP_LIMIT_PCT,
  RAMP_MIN_HOURS,
  SHORT_SLEEP_HOURS,
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
