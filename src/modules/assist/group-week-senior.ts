import { DATA_RULE, fenceUntrusted, languageRule } from "@/modules/ai/prompting";
import {
  DCU_2025,
  HARD_PER_WEEK,
  profileOf,
  seasonOfMonth,
  seniorStrengthFrequency,
  type SeniorBasis,
  type SeniorSeason,
} from "@/modules/paradigms";

/**
 * "Foreslå ugen for gruppen" for adults on a training profile
 * (docs/adr/0092): the same draft as for a youth class-year (group-week.ts,
 * ADR 0043), worded for an adult. The persona is a coach of adult
 * recreational riders, the hours and corridor are the profile's
 * (senior.ts, through the paradigm), the hard sessions are the profile's
 * one or two, and the library is said to hold Kadence's strength
 * programmes for adults. No youth race rules, no youth reader, and no word
 * of a federation whose numbers these are not. Pure.
 */

export type SeniorGroupContext = {
  monday: string;
  guided: boolean;
  basis: SeniorBasis;
  wish: string;
  events: Array<{ kind: string; title: string; from: string; to: string; priority: string | null }>;
  templates: Array<{ id: string; name: string; sport: string; minutes: number }>;
};

const SEASON_LINE: Record<SeniorSeason, string> = {
  winter: "winter base: mostly easy endurance, strength and one or two quality sessions",
  spring: "spring build: more hours, a long ride at the weekend, the hard sessions sharpen",
  summer: "summer: the most hours, long rides and events",
  easy: "a free month: short, easy rides and nothing hard",
};

export function seniorGroupWeekPrompt(c: SeniorGroupContext, locale: string) {
  const profile = profileOf(c.basis);
  const name = profile === "super-motionist" ? "Supermotionist" : "Motionist";
  const hard = HARD_PER_WEEK[profile];
  const corridor = DCU_2025.weeklyCorridor(c.basis, c.monday);
  const strength = seniorStrengthFrequency(c.basis, c.monday);
  const season = seasonOfMonth(Number(c.monday.slice(5, 7)));
  const system = [
    c.guided
      ? `You are an experienced Danish cycling coach drafting one week of training for a group of adult recreational riders on the same training profile, following Kadence's own ${name} profile for adults.`
      : "You are an experienced Danish cycling coach drafting one week of training for a group of adult recreational riders.",
    'Answer with one JSON object: {"sessions": [{"date": "YYYY-MM-DD", "sport": "bike"|"strength"|"other", "title": "", "minutes": n, "templateId": "", "workout": "", "why": ""}], "note": ""}.',
    "For a bike session, write the workout in the coach's shorthand, e.g. '15 min opvarmning, 3x10 min Z4 / 5 min pause, 10 min nedkørsel' or '2 t Z2'. Zones: 1 recovery, 2 endurance, 3 tempo, 4 threshold (AT), 5 VO2max, 6 anaerobic, 7 sprint.",
    `For a session from the library, use its templateId when one fits: Kadence's sessions and strength programmes for adults may be there, and the strength programme for this group is "${name} styrke". Otherwise leave it empty.`,
    c.guided
      ? `Aim the week's bike hours at the profile's target and stay inside its corridor. Mostly easy rides in zone 1–2, at most ${hard} hard ${hard === 1 ? "session" : "sessions"}, and a long ride at the weekend. Keep strength sessions at least 48 hours apart. Give at least one rest day. Keep the day before an A event easy.`
      : `The team plans without an hour model: plan the hours the coach asks for, rising at most 15 % from last week. Mostly easy rides, at most ${hard} hard ${hard === 1 ? "session" : "sessions"}. Keep strength sessions at least 48 hours apart. Give at least one rest day. Keep the day before an A event easy.`,
    c.guided
      ? "Follow the coach's wishes for the week where they fit the profile; where they do not, follow the profile and say so in the note."
      : "Follow the coach's wishes for the week.",
    "These are adults with work and family: keep sessions on weekdays short and put the long ride at the weekend.",
    "Never mention the riders' weight, bodies or food portions.",
    "why: one short sentence per session. note: two sentences at most for the coach.",
    DATA_RULE,
    languageRule(locale),
  ].join(" ");
  const user = [
    c.guided
      ? `Week starting ${c.monday}. Profile: ${name}, Kadence's own training profile for adults. Season: ${SEASON_LINE[season]}.`
      : `Week starting ${c.monday}. Adult recreational riders. Season: ${SEASON_LINE[season]}.`,
    !c.guided
      ? "The team sets its own hours."
      : corridor.target > 0
        ? `${name} bike hours this week: target ${corridor.target.toFixed(1)}, corridor ${corridor.low.toFixed(1)}–${corridor.high.toFixed(1)}.`
        : "October is a free month: no set hours.",
    `Strength this time of year: ${strength.perWeekMin === strength.perWeekMax ? strength.perWeekMin : `${strength.perWeekMin}–${strength.perWeekMax}`} ${strength.perWeekMax === 1 ? "session" : "sessions"} a week.`,
    `The coach's wishes for the week: ${fenceUntrusted(c.wish || "none", 600)}`,
    `The team's calendar: ${fenceUntrusted(JSON.stringify(c.events), 2000)}`,
    `Library: ${fenceUntrusted(JSON.stringify(c.templates), 3000)}`,
  ].join("\n");
  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}
