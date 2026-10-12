import { DCU_2025 } from "./dcu-2025";
import type { GuidanceId, Paradigm } from "./paradigm";

/**
 * The paradigm a team plans by (docs/adr/0049), or null when the team has
 * chosen to plan without one. Pure: imports nothing from the database.
 */
export function paradigmFor(guidance: GuidanceId): Paradigm | null {
  return guidance === "dcu-2025" ? DCU_2025 : null;
}

export { DCU_2025 } from "./dcu-2025";
export {
  LOW_INTENSITY_FIRST,
  PROFILE_MONTHS,
  profileFor,
  type IntensityProfile,
} from "./low-intensity-first";
export {
  DEFAULT_GUIDANCE,
  GUIDANCE_IDS,
  isGuidanceId,
  isPlanBasis,
  type GuidanceId,
  type Paradigm,
  type PlanBasis,
} from "./paradigm";
export {
  DEFAULT_SENIOR_PROFILE,
  SENIOR_BASES,
  SENIOR_HOURS,
  SENIOR_LONGEST_RIDE,
  SENIOR_PROFILES,
  isSeniorBasis,
  isSeniorProfile,
  profileOf,
  referenceOf,
  seniorBasisOf,
  seniorMonthHours,
  seniorSeasonHours,
  seniorStrengthFrequency,
  seniorWeeklyCorridor,
  type SeniorBasis,
  type Reference,
  type SeniorProfile,
} from "./senior";
