/**
 * Rulle, the indoor part of Kadence (ADR 0033): today's session on a
 * trainer, ridden through a landscape. This is the logic that needs no
 * browser and no database, tested on its own:
 *
 * - a route from a GPX file, made into a loop to ride (`route/`);
 * - the physics that turn watts into a speed along it;
 * - the session as blocks with the watts to hold and the watts that count;
 * - the ride as it is recorded, and as the FIT file it is saved as;
 * - what a trainer, a power meter and a heart-rate strap say over
 *   Bluetooth, and what Rulle says back (`ble/`);
 * - the small things on the way and what they came to (ADR 0034);
 * - the challenger who now and then races the rider (ADR 0074), and the
 *   sprinter TURBO calls (ADR 0075).
 *
 * The browser's half — Bluetooth, the landscape, the screen — is in
 * src/components/rulle.
 */
export {
  readRouteGpx,
  RouteError,
  ROUTE_LIMITS,
  type RouteErrorCode,
  type RouteFile,
  type RoutePoint,
} from "./route/gpx-route";
export {
  buildCourse,
  COURSE,
  courseAt,
  toPlane,
  type Course,
  type CoursePoint,
} from "./route/course";
export { FLAT_LAP_M, flatCourse } from "./route/flat";
export {
  BANK,
  COVER_CELL,
  LAND_KINDS,
  landFileSchema,
  MAPPED,
  readLand,
  type AreaKind,
  type BuildingKind,
  type RoofShape,
  type Land,
  type LandFile,
  type LineKind,
  type RoadKind,
  type StructureKind,
} from "./route/land";
export {
  bundledRoute,
  DEFAULT_ROUTE,
  ROUTES,
  type BundledRoute,
  type City,
  type RouteCredit,
  type RouteKey,
} from "./route/routes";
export { nextSpeed, PHYSICS, resistance, steadySpeed, swayAt } from "./physics";
export {
  CHALLENGE,
  challengeIn,
  challengerEffort,
  challengerWatts,
  draft,
  type ChallengeStart,
  type ChallengerAt,
  type ChallengerEffort,
  type Rival,
} from "./challenge";
export { criticalPower, jumpAt, reserveAfter, SPRINTER, wattsFor, type Effort } from "./sprinter";
export {
  blockAt,
  buildTimeline,
  ergWatts,
  isHard,
  ON_TARGET_SLACK,
  scaledBand,
  standing,
  type Band,
  type Block,
  type BlockNow,
  type SessionTimeline,
  type Standing,
} from "./timeline";
export {
  closeLap,
  endRecording,
  pauseRecording,
  readRecording,
  record,
  recordingSchema,
  resumeRecording,
  startRecording,
  totals,
  type Reading,
  type Recording,
  type RideTotals,
} from "./recording";
export { rideToFit, type RideFitOptions } from "./ride-fit";
export { CHARACTERISTIC, SERVICE } from "./ble/uuids";
export {
  control,
  parseControlResponse,
  parseFeatures,
  parseIndoorBikeData,
  parsePowerRange,
  parseStatus,
  type ControlResult,
  type IndoorBikeData,
  type MachineFeatures,
  type PowerRange,
} from "./ble/ftms";
export {
  CADENCE_STALE_SECONDS,
  CrankCadence,
  parsePowerMeasurement,
  type PowerMeasurement,
} from "./ble/cycling-power";
export { parseHeartRate } from "./ble/heart-rate";
export { hash } from "./hash";
export {
  chalkOf,
  drinksIn,
  flagsOf,
  herdsOf,
  herdsOn,
  PAUSE_AT,
  pauseStage,
  riseOver,
  steepestClimb,
  stopKind,
  VISITOR_SPEED,
  visitsOnLap,
  type Chalk,
  type Climb,
  type Flag,
  type Herd,
  type PauseStage,
  type StopKind,
  type Visit,
  type VisitorKind,
} from "./happenings";
export { punctureOnLap, ridersOnLap, type Puncture, type Rider, type RiderKind } from "./traffic";
export { gradeHere, POSTURE, postureAt, type Posture } from "./posture";
export {
  crowdHeard,
  HEARING,
  mixOf,
  placeAt,
  Towns,
  type Heard,
  type Mix,
  type Place,
} from "./hearing";
export { CITIES, sunToward, type CityFace } from "./route/cities";
export {
  STRUCTURES,
  structuresOn,
  WIDE,
  type Overpass,
  type Structures,
  type Underpass,
} from "./route/structures";
export {
  crowdAt,
  inside,
  lapAlong,
  lapGap,
  RACE_DAY,
  raceDayOf,
  type Bend,
  type Crowd,
  type RaceDay,
  type Side,
  type Spot,
  type Stretch,
} from "./route/race-day";
export {
  MARK_LIMITS,
  markKind,
  marksOn,
  type CourseMark,
  type MarkKind,
  type RouteMark,
} from "./route/marks";
export {
  HIMMELBJERGET_M,
  littleThings,
  nothingSeen,
  pauseLengths,
  seenSchema,
  type LittleThing,
  type Seen,
} from "./little-things";
