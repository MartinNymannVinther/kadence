import { activityLoad, plannedLoad, type LoadMethod } from "@/modules/load";
import type { Structure } from "@/modules/workouts/structure";

/**
 * Where the training services meet the load model (src/modules/load, ADR
 * 0016). One file, so the services do not each know how load is estimated.
 */

/** The load a planned session is expected to bring, or null when it cannot be told. */
export function estimatePlannedLoad(structure: Structure, minutes: number): number | null {
  const load = plannedLoad(structure, minutes);
  return load > 0 ? load : null;
}

/** The load of an activity entered by hand: its session RPE is all there is. */
export function loadFromRpe(
  minutes: number,
  rpe: number | null,
  sport: "bike" | "strength" | "other" = "bike",
): { load: number | null; method: LoadMethod } {
  const result = activityLoad({ sport, seconds: minutes * 60, rpe }, {});
  return { load: result.method === "none" ? null : result.load, method: result.method };
}
