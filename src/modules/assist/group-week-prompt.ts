import {
  PHASE_INFO,
  phaseOf,
  strengthFrequency,
  weeklyCorridor,
  type ClassBasis,
} from "@/modules/dcu";
import { DATA_RULE, fenceUntrusted, languageRule } from "@/modules/ai/prompting";
import { isSeniorBasis, type PlanBasis } from "@/modules/paradigms";
import { seniorGroupWeekPrompt } from "./group-week-senior";
import { raceWeekRules, type PromptEvent } from "./race-week";
import { raceRulesLine } from "./week-draft-prompt";

/**
 * The words "Foreslå ugen for gruppen" sends the model (group-week.ts,
 * ADR 0043): a youth class-year's DCU hours and phase, or an adult
 * training profile's in words of its own (group-week-senior.ts, ADR
 * 0092), the race-week rules (docs/adr/0101), the coach's words and the
 * calendar fenced as data. Pure.
 */

export type GroupWeekContext = {
  monday: string;
  /** Whether the team plans by DCU (ADR 0049). */
  guided: boolean;
  basis: PlanBasis;
  wish: string;
  events: PromptEvent[];
  templates: Array<{ id: string; name: string; sport: string; minutes: number }>;
};

export function groupWeekPrompt(c: GroupWeekContext, locale: string) {
  if (isSeniorBasis(c.basis)) return seniorGroupWeekPrompt({ ...c, basis: c.basis }, locale);
  return classGroupWeekPrompt({ ...c, basis: c.basis }, locale);
}

function classGroupWeekPrompt(c: GroupWeekContext & { basis: ClassBasis }, locale: string) {
  const category = c.basis.split("-")[0]!;
  const corridor = weeklyCorridor(c.basis, c.monday);
  const strength = strengthFrequency(c.monday);
  const phase = phaseOf(Number(c.monday.slice(5, 7)));
  const system = [
    c.guided
      ? "You are an experienced Danish youth cycling coach drafting one week of training for a group of riders of the same class, following Cycling Denmark's (DCU) recommendations for the class."
      : "You are an experienced Danish youth cycling coach drafting one week of training for a group of riders of the same class.",
    'Answer with one JSON object: {"sessions": [{"date": "YYYY-MM-DD", "sport": "bike"|"strength"|"other", "title": "", "minutes": n, "templateId": "", "workout": "", "why": ""}], "note": ""}.',
    "For a bike session, write the workout in the coach's shorthand, e.g. '15 min opvarmning, 3x10 min Z4 / 5 min pause, 10 min nedkørsel' or '2 t Z2'. Zones: 1 recovery, 2 endurance, 3 tempo, 4 threshold (AT), 5 VO2max, 6 anaerobic, 7 sprint.",
    "For a strength session, use a templateId from the library when one fits (DCU's strength programmes are there); otherwise leave it empty.",
    c.guided
      ? "Aim the week's bike hours at DCU's target and stay inside its corridor. Follow the phase. Keep strength sessions at least 48 hours apart. Give at least one rest day."
      : "The team plans without a federation's hour model (ADR 0049): plan the hours the coach asks for, rising at most 15 % from last week. Keep strength sessions at least 48 hours apart. Give at least one rest day.",
    raceWeekRules("youth", locale),
    c.guided
      ? "Follow the coach's wishes for the week where they fit DCU's frame; where they do not, follow DCU and say so in the note."
      : "Follow the coach's wishes for the week.",
    "Never mention the riders' weight, bodies or food portions.",
    "why: one short sentence per session a 16-year-old understands. note: two sentences at most for the coach.",
    DATA_RULE,
    languageRule(locale),
  ].join(" ");
  const user = [
    c.guided
      ? `Week starting ${c.monday}. Class: ${category} (${c.basis}). DCU phase: ${phase} — ${PHASE_INFO[phase].description}.`
      : `Week starting ${c.monday}. Class: ${category}.`,
    !c.guided
      ? "The team sets its own hours."
      : corridor.target > 0
        ? `DCU bike hours this week: target ${corridor.target.toFixed(1)}, corridor ${corridor.low.toFixed(1)}–${corridor.high.toFixed(1)}.`
        : "DCU's October: break and free riding, no set hours.",
    raceRulesLine(category),
    `Strength this time of year: ${strength.perWeekMin}–${strength.perWeekMax} sessions a week.`,
    `The coach's wishes for the week: ${fenceUntrusted(c.wish || "none", 600)}`,
    `The calendar: ${fenceUntrusted(JSON.stringify(c.events), 2000)}`,
    `Library: ${fenceUntrusted(JSON.stringify(c.templates), 3000)}`,
  ].join("\n");
  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}
