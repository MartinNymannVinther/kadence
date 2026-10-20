/**
 * FIT files, read and written by Kadence itself (CLAUDE.md: no dependency).
 * Pure: imports nothing from the database, and runs wherever a
 * `Uint8Array` does.
 *
 * - `decodeFit` reads an uploaded ride (or a workout) and refuses what it
 *   cannot read with a `FitError`;
 * - `summarizeActivity` turns a decoded ride into its totals, its one-second
 *   power and heart rate, thinned streams and the route for charts, and
 *   its laps and climbs;
 * - `FitWriter` writes FIT messages, for workout files and test fixtures.
 */
export { decodeFit, FIT_LIMITS, type DecodeOptions } from "./decode";
export {
  FitWriter,
  type FitDefineOptions,
  type FitDeveloperFieldSpec,
  type FitFieldSpec,
  type FitValues,
  type FitWriteOptions,
} from "./encode";
export { stringFieldSize, type BaseTypeName, type FieldValue } from "./base-types";
export { fitCrc } from "./crc";
export { FitError, type FitErrorCode } from "./errors";
export { readHeader, writeHeader, type FitHeader, type HeaderOptions } from "./header";
export * from "./profile";
export {
  activitySport,
  summarizeActivity,
  STREAM_SECONDS,
  type ActivityStreams,
  type ActivitySummary,
} from "./summarize";
export { findClimbs, MAX_CLIMBS, type ClimbSummary } from "./climbs";
export { MAX_LAPS, summarizeLaps, type LapSummary } from "./laps";
export {
  MAX_HOLD_SECONDS,
  MAX_TIMELINE_SECONDS,
  MAX_TRAVEL_GAP_SECONDS,
  MOVING_SPEED,
  PLAUSIBLE,
} from "./timeline";
export type {
  FitActivity,
  FitEvent,
  FitFile,
  FitLap,
  FitRecord,
  FitSession,
  FitWorkout,
  FitWorkoutStep,
} from "./types";
