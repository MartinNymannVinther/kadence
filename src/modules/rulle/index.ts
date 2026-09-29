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
 *   Bluetooth, and what Rulle says back (`ble/`).
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
export { buildCourse, COURSE, courseAt, type Course, type CoursePoint } from "./route/course";
export {
  bundledRoute,
  DEFAULT_ROUTE,
  ROUTES,
  type BundledRoute,
  type RouteCredit,
  type RouteKey,
} from "./route/routes";
export { nextSpeed, PHYSICS, resistance, steadySpeed, swayAt } from "./physics";
export {
  blockAt,
  buildTimeline,
  ergWatts,
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
