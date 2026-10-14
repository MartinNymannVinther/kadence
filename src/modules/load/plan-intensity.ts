import { flattenSteps, readStructure, type Structure } from "@/modules/workouts/structure";

/**
 * What a planned session says about how hard it should be — which decides
 * whether a load can be compared with it at all (compliance.ts, the
 * amendment of 14 October to docs/adr/0095).
 *
 * - **none**: the plan says only how long. No structure; a bike session
 *   with no steps or only open steps; an "other" session, which is words
 *   and minutes ("Løbetur 30 min"). Its planned load is an estimate from
 *   the minutes alone (planned-load.ts), so a ride can be longer or
 *   shorter than it, never harder or easier.
 * - **set**: at least one step targets a zone, a share of FTP or an RPE.
 *   A strength session with at least one exercise counts here too: its
 *   sets, reps and RM are how hard, and its colour follows the 13 October
 *   rule for how it felt. A strength session with no exercises
 *   ("Styrketræning 1 t" and nothing in it) says only how long, so it is
 *   **none** and judged by minutes (the amendment of 15 October). Every
 *   exercise carries a dose — the schema requires sets and reps — so one
 *   exercise is enough.
 * - **pulse**: as set, and at least one step targets a share of
 *   threshold heart rate — the one plan a heart-rate load from another
 *   sport than the bike may be compared with.
 *
 * Pure: imports nothing from the database.
 */

export type PlanIntensity = "none" | "set" | "pulse";

/** What a structure says about how hard; see the file comment. */
export function planIntensity(structure: Structure | null | undefined): PlanIntensity {
  if (!structure || structure.kind === "other") return "none";
  if (structure.kind === "strength") return structure.exercises.length > 0 ? "set" : "none";
  let set = false;
  for (const step of flattenSteps(structure)) {
    if (step.target.kind === "hr_pct") return "pulse";
    if (step.target.kind !== "open") set = true;
  }
  return set ? "set" : "none";
}

/** Whether a plan says how hard, not only how long. */
export function planCarriesIntensity(structure: Structure | null | undefined): boolean {
  return planIntensity(structure) !== "none";
}

const SPORTS = ["bike", "strength", "other"] as const;

/**
 * The same for a stored session: its sport and its `structure` jsonb.
 * Undefined when the caller does not have the structure, so the colour
 * reads as it did before the amendment.
 */
export function planIntensityOf(session: {
  sport: string;
  structure?: unknown;
}): PlanIntensity | undefined {
  if (session.structure === undefined) return undefined;
  const sport = SPORTS.find((s) => s === session.sport);
  return sport ? planIntensity(readStructure(session.structure, sport)) : "none";
}
