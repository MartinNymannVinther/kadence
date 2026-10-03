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
  DEFAULT_GUIDANCE,
  GUIDANCE_IDS,
  isGuidanceId,
  type GuidanceId,
  type Paradigm,
} from "./paradigm";
