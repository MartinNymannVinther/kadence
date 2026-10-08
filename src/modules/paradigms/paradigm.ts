import type { ClassBasis, DcuCategory, WeeklyCorridor } from "@/modules/dcu";

/**
 * A training paradigm: the model a team's season plan and guardrails are
 * measured against (docs/adr/0049). DCU's 2025 recommendations are the
 * first and the default; a team may choose none. Other hour models — BDR
 * 2009, SCF 2025 — come as further implementations of the same shape
 * (docs/research/traeningsparadigmer.md, section 8). "Lav intensitet
 * først" is not one: it sets no hours and lies on top of whichever the
 * team plans by (low-intensity-first.ts, docs/adr/0053).
 *
 * A paradigm may add or tighten guardrails, never loosen Kadence's own
 * defaults for young riders: the health flags (pain, wellbeing, sleep),
 * the week-to-week ramp and strength spacing, and the race rules, which
 * are DCU's rules rather than its recommendations, stay whatever is chosen.
 *
 * Pure: imports nothing from the database.
 */

export type GuidanceId = "dcu-2025" | "none";

export const GUIDANCE_IDS: readonly GuidanceId[] = ["dcu-2025", "none"];

export const DEFAULT_GUIDANCE: GuidanceId = "dcu-2025";

export type Paradigm = {
  id: Exclude<GuidanceId, "none">;
  /** Hours on the bike for a class-year in a month (1–12); 0 when the model sets none. */
  monthHours(basis: ClassBasis, month: number): number;
  /** The week's hours as a corridor round the model's target. */
  weeklyCorridor(basis: ClassBasis, mondayIso: string): WeeklyCorridor;
  /** The longest training ride for the class, when the model sets one. */
  longestRide(category: DcuCategory): { hours: number; km: number } | null;
};

export function isGuidanceId(value: string): value is GuidanceId {
  return (GUIDANCE_IDS as readonly string[]).includes(value);
}
