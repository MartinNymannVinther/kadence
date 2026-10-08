import { LONGEST_RIDE, monthHours, weeklyCorridor } from "@/modules/dcu";
import type { Paradigm } from "./paradigm";

/**
 * Cycling Denmark's 2025 recommendations as a paradigm (ADR 0014, 0049).
 * The numbers stay where they are, in src/modules/dcu with their sources;
 * this only answers the paradigm's questions with them.
 */
export const DCU_2025: Paradigm = {
  id: "dcu-2025",
  monthHours,
  weeklyCorridor,
  longestRide: (category) => {
    const limit = LONGEST_RIDE[category];
    return limit ? { hours: limit.hours, km: limit.km } : null;
  },
};
