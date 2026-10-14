import type { GuideSectionId } from "./guide";

/** Which section of the coach guide says more about a guardrail flag. */
export const FLAG_SECTION: Record<string, GuideSectionId> = {
  hours_above_corridor: "volume",
  hours_below_corridor: "volume",
  ramp: "volume",
  longest_ride: "classes",
  strength_spacing: "strength",
  wellbeing_talk: "wellbeing",
  wellbeing_help: "wellbeing",
  pain: "injury",
  known_pain_lasting: "injury",
  sleep_short: "sleepFood",
  sleep_below_minimum: "sleepFood",
  compliance: "role",
  mid_zone: "volume",
};
