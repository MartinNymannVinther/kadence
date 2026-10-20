import { LONGEST_RIDE, monthHours, strengthFrequency, weeklyCorridor } from "@/modules/dcu";
import type { Paradigm } from "./paradigm";
import {
  SENIOR_LONGEST_RIDE,
  isSeniorBasis,
  seniorMonthHours,
  seniorStrengthFrequency,
  seniorWeeklyCorridor,
} from "./senior";

/**
 * Cycling Denmark's 2025 recommendations as a paradigm (ADR 0014, 0049).
 * The numbers stay where they are, in src/modules/dcu with their sources;
 * this only answers the paradigm's questions with them. DCU has no
 * numbers for riders past U23, so a senior's profile answers with
 * Kadence's own (senior.ts, docs/adr/0091): a team that plans by DCU
 * gets them for its adults, and nothing changes for U17–U23.
 */
export const DCU_2025: Paradigm = {
  id: "dcu-2025",
  monthHours: (basis, month) =>
    isSeniorBasis(basis) ? seniorMonthHours(basis, month) : monthHours(basis, month),
  weeklyCorridor: (basis, mondayIso) =>
    isSeniorBasis(basis)
      ? seniorWeeklyCorridor(basis, mondayIso)
      : weeklyCorridor(basis, mondayIso),
  longestRide: (of) => {
    const limit = isSeniorBasis(of) ? SENIOR_LONGEST_RIDE[of] : LONGEST_RIDE[of];
    return limit ? { hours: limit.hours, km: limit.km } : null;
  },
  strengthFrequency: (basis, dateIso) =>
    isSeniorBasis(basis) ? seniorStrengthFrequency(basis, dateIso) : strengthFrequency(dateIso),
};
