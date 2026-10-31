/**
 * What a rider's permissions at Garmin mean to Kadence (docs/adr/0113).
 * A rider chooses on Garmin's consent page what to share, and may change
 * it later in Garmin Connect; Kadence reads the list after connecting and
 * whenever Garmin says it changed (permissions.ts), and keeps it on the
 * link. Null is a list nobody has read. Pure.
 */

/** Rides go from Garmin to Kadence. */
export const ACTIVITY_EXPORT = "ACTIVITY_EXPORT";
/** Kadence may put a workout in the rider's Garmin account. */
export const WORKOUT_IMPORT = "WORKOUT_IMPORT";

/** Whether rides come in; null when the list was never read. */
export function sharesActivities(permissions: readonly string[] | null): boolean | null {
  return permissions === null ? null : permissions.includes(ACTIVITY_EXPORT);
}

/** Whether a session may be sent; only when the list says so. */
export function allowsWorkouts(permissions: readonly string[] | null): boolean {
  return permissions?.includes(WORKOUT_IMPORT) ?? false;
}
