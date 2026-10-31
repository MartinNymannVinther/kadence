import type { Sport } from "@/modules/training/vocabulary";

/**
 * Which of Kadence's three sports a ride from Garmin is, from the type
 * Garmin Connect gives it (docs/adr/0113). Every type comes in: a ride on
 * any kind of bike is `bike`, strength training is `strength`, and the
 * rest — a run, a swim, a walk, skiing — is `other`, which the calendar
 * shows without counting it as riding.
 *
 * The type is what the rider last said in Garmin Connect, so it decides
 * over the sport written inside the file, as a Strava archive's list does
 * over a GPX (ADR 0030). Without a type the file decides, as for any
 * upload (src/modules/fit/summarize.ts). Pure.
 */

const CYCLING = new Set([
  "CYCLING",
  "BMX",
  "CYCLOCROSS",
  "DOWNHILL_BIKING",
  "E_BIKE_FITNESS",
  "E_BIKE_MOUNTAIN",
  "E_ENDURO_MTB",
  "ENDURO_MTB",
  "GRAVEL_CYCLING",
  "INDOOR_CYCLING",
  "MOUNTAIN_BIKING",
  "RECUMBENT_CYCLING",
  "ROAD_BIKING",
  "TRACK_CYCLING",
  "VIRTUAL_RIDE",
  "HANDCYCLING",
  "INDOOR_HANDCYCLING",
]);

const STRENGTH = new Set(["STRENGTH_TRAINING"]);

/** Kadence's sport for a Garmin activity type; undefined when there is no type to go by. */
export function garminSport(activityType: string | null | undefined): Sport | undefined {
  const type = (activityType ?? "").trim().toUpperCase();
  if (!type) return undefined;
  if (CYCLING.has(type)) return "bike";
  if (STRENGTH.has(type)) return "strength";
  return "other";
}
