import type { Structure } from "@/modules/workouts/structure";

/**
 * Where the training services meet the load model (src/modules/load).
 * One file, so the services do not each know how load is estimated.
 */

type RiderThresholds = { ftp: number | null; thresholdHr: number | null } | null;

/** The load a planned session is expected to bring, or null when it cannot be told. */
export function estimatePlannedLoad(
  structure: Structure,
  minutes: number,
  _rider: RiderThresholds,
): number | null {
  if (minutes <= 0) return null;
  // Until the load model lands: a moderate hour (RPE 5) as the estimate.
  const hours = minutes / 60;
  const rpe = structure.kind === "strength" ? 6 : 5;
  return Math.round(hours * 100 * (rpe / 8) ** 2);
}

/** The load of an activity from its session RPE alone. */
export function loadFromRpe(
  minutes: number,
  rpe: number | null,
): { load: number | null; method: "rpe" | "none" } {
  if (!rpe || minutes <= 0) return { load: null, method: "none" };
  return { load: Math.round((minutes / 60) * 100 * (rpe / 8) ** 2), method: "rpe" };
}
