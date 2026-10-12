import {
  isClassBasis,
  type ClassBasis,
  type DcuCategory,
  type StrengthFrequency,
  type WeeklyCorridor,
} from "@/modules/dcu";
import { isSeniorBasis, type SeniorBasis } from "./senior";

/**
 * A training paradigm: the model a team's season plan and guardrails are
 * measured against (docs/adr/0049). DCU's 2025 recommendations are the
 * first and the default; a team may choose none. Other hour models — BDR
 * 2009, SCF 2025 — come as further implementations of the same shape
 * (docs/research/traeningsparadigmer.md, section 8). "Lav intensitet
 * først" is not one: it sets no hours and lies on top of whichever the
 * team plans by (low-intensity-first.ts, docs/adr/0053).
 *
 * A plan's basis is one of DCU's class-years ("U19-1") or, for a rider
 * past U23, one of Kadence's own senior profiles ("senior-motionist",
 * senior.ts, docs/adr/0091). DCU's own functions keep DCU's `ClassBasis`;
 * the paradigm answers for both.
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

/** What a season plan is filled from and measured against. */
export type PlanBasis = ClassBasis | SeniorBasis;

export function isPlanBasis(value: unknown): value is PlanBasis {
  return isClassBasis(value) || isSeniorBasis(value);
}

export type Paradigm = {
  id: Exclude<GuidanceId, "none">;
  /** Hours on the bike for a basis in a month (1–12); 0 when the model sets none. */
  monthHours(basis: PlanBasis, month: number): number;
  /** The week's hours as a corridor round the model's target. */
  weeklyCorridor(basis: PlanBasis, mondayIso: string): WeeklyCorridor;
  /** The longest training ride for a DCU class or a senior profile, when the model sets one. */
  longestRide(of: DcuCategory | SeniorBasis): { hours: number; km: number } | null;
  /** How many strength sessions a week on a date, for the basis; DCU's when there is none. */
  strengthFrequency(basis: PlanBasis | null, dateIso: string): StrengthFrequency;
};

export function isGuidanceId(value: string): value is GuidanceId {
  return (GUIDANCE_IDS as readonly string[]).includes(value);
}
