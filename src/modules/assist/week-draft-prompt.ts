import { DATA_RULE, fenceUntrusted, languageRule } from "@/modules/ai/prompting";
import { RACE_RULES, raceRulesFor } from "@/modules/dcu";

/**
 * The words "Foreslå ugen" sends the model (week-draft.ts, ADR 0017):
 * DCU's hours and phase for a rider in U17–U23, a senior's training
 * profile (docs/adr/0091), or the team's own hours when it plans without
 * a paradigm (ADR 0049). Pure.
 */

export type WeekDraftContext = {
  monday: string;
  /** Whether the team plans by DCU (ADR 0049); without, the model is told nothing of DCU's hours. */
  guided: boolean;
  category: string;
  basis: string | null;
  phase: string;
  corridor: { low: number; target: number; high: number } | null;
  /** A senior's profile and its hours this month (docs/adr/0091); null for U17–U23 and youth. */
  senior: { profile: "motionist" | "super-motionist"; monthHours: number } | null;
  strength: { min: number; max: number };
  planned: Array<{ date: string; sport: string; title: string; minutes: number }>;
  events: Array<{ kind: string; title: string; from: string; to: string; priority: string | null }>;
  recentWeeks: number[];
  flags: string[];
  templates: Array<{ id: string; name: string; sport: string; minutes: number }>;
};

export function weekDraftPrompt(c: WeekDraftContext, locale: string) {
  const senior = c.guided ? c.senior : null;
  const profileName = senior?.profile === "super-motionist" ? "Supermotionist" : "Motionist";
  const system = [
    senior
      ? "You are an experienced Danish cycling coach drafting one week of training for one adult recreational rider, following Kadence's own training profile for adults (Cycling Denmark has no hours for riders past U23)."
      : c.guided
        ? "You are an experienced Danish youth cycling coach drafting one week of training for one rider, following Cycling Denmark's (DCU) recommendations for the rider's age class."
        : "You are an experienced Danish youth cycling coach drafting one week of training for one rider.",
    'Answer with one JSON object: {"sessions": [{"date": "YYYY-MM-DD", "sport": "bike"|"strength"|"other", "title": "", "minutes": n, "templateId": "" , "workout": "", "why": ""}], "note": ""}.',
    "For a bike session, write the workout in the coach's shorthand, e.g. '15 min opvarmning, 3x10 min Z4 / 5 min pause, 10 min nedkørsel' or '2 t Z2'. Zones: 1 recovery, 2 endurance, 3 tempo, 4 threshold (AT), 5 VO2max, 6 anaerobic, 7 sprint.",
    senior
      ? `For a session from the library, use its templateId when one fits: Kadence's sessions and strength programmes for adults may be there, and the strength programme for this rider is "${profileName} styrke". Otherwise leave it empty.`
      : "For a strength session, use a templateId from the library when one fits (DCU's strength programmes are there); otherwise leave it empty.",
    senior
      ? "Aim the week's bike hours at the profile's target and stay inside its corridor. Mostly easy rides and a few hard sessions. Keep strength sessions at least 48 hours apart. Give at least one rest day. Keep the day before an A race easy."
      : c.guided
        ? "Aim the week's bike hours at DCU's target and stay inside its corridor. Follow the phase. Keep strength sessions at least 48 hours apart. Give at least one rest day. Keep the day before an A race easy, and lighten exam days."
        : "The team plans without a federation's hour model (ADR 0049): keep the week's bike hours close to the last weeks' and rise at most 15 % from week to week. Keep strength sessions at least 48 hours apart. Give at least one rest day. Keep the day before an A race easy, and lighten exam days.",
    "Never mention the rider's weight, body or food portions.",
    "Do not repeat sessions already planned. Respect the guardrails: if the rider shows signs of fatigue, pain or poor wellbeing, plan less and say so in the note.",
    senior
      ? "why: one short sentence per session. note: two sentences at most for the rider."
      : "why: one short sentence per session a 16-year-old understands. note: two sentences at most for the coach.",
    DATA_RULE,
    languageRule(locale),
  ].join(" ");
  const user = [
    senior
      ? `Week starting ${c.monday}. The rider is a senior on the ${profileName} profile, about ${Math.round(senior.monthHours)} hours on the bike this month. Season phase: ${c.phase}.`
      : c.guided
        ? `Week starting ${c.monday}. Class: ${c.category}${c.basis ? ` (${c.basis})` : ""}. DCU phase: ${c.phase}.`
        : `Week starting ${c.monday}. Class: ${c.category}.`,
    senior
      ? c.corridor
        ? `${profileName} bike hours this week: target ${c.corridor.target.toFixed(1)}, corridor ${c.corridor.low.toFixed(1)}–${c.corridor.high.toFixed(1)}.`
        : "No set hours this week."
      : c.guided
        ? c.corridor
          ? `DCU bike hours this week: target ${c.corridor.target.toFixed(1)}, corridor ${c.corridor.low.toFixed(1)}–${c.corridor.high.toFixed(1)}.`
          : "No DCU hours for this rider's class."
        : "The team sets its own hours.",
    raceRulesLine(c.category),
    `Strength this time of year: ${c.strength.min}–${c.strength.max} sessions a week.`,
    `Bike hours the last weeks: ${c.recentWeeks.map((h) => h.toFixed(1)).join(", ") || "none recorded"}.`,
    `Guardrails now: ${c.flags.join(", ") || "none"}.`,
    `Already planned: ${fenceUntrusted(JSON.stringify(c.planned), 2000)}`,
    `Calendar: ${fenceUntrusted(JSON.stringify(c.events), 2000)}`,
    `Library: ${fenceUntrusted(JSON.stringify(c.templates), 3000)}`,
  ].join("\n");
  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

/** DCU's race limits for the class (Sporstlige_regler_2026), as a line of context. */
export function raceRulesLine(category: string): string {
  if (category !== "U17" && category !== "U19" && category !== "U23")
    return "No DCU race rules for this class.";
  const r = raceRulesFor(category);
  const parts = [
    r.roadMaxKm !== null ? `road races at most ${r.roadMaxKm} km` : null,
    r.timeTrialMaxKm !== null ? `time trials at most ${r.timeTrialMaxKm} km` : null,
    r.gearingM !== null
      ? `gearing at most ${r.gearingM} m per pedal revolution`
      : "no gearing limit",
    `stage races at most ${r.stageRaceMaxDays} days`,
  ].filter(Boolean);
  return `DCU race rules for ${category}${category === "U19" ? ` (men; women race at most ${RACE_RULES.U19.women.roadMaxKm} km)` : ""}: ${parts.join(", ")}.`;
}
