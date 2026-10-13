import type { LlmMessage } from "@/core/llm";
import { DATA_RULE, fenceUntrusted, languageRule } from "@/modules/ai/prompting";
import { asString, rec } from "@/modules/ai/sanitize-helpers";
import type { Category } from "@/modules/dcu";
import type { ComplianceColour, DeviationFact, DeviationStory } from "@/modules/load";
import type { SeniorProfile } from "@/modules/paradigms";

/**
 * The words around "Få en kommentar fra AI'en" (docs/adr/0095): the
 * prompt for a short, warm comment on one session that was done, and
 * the sanitizer its answer passes before anybody sees it.
 *
 * The model gets the session's numbers and nothing about the person: the
 * planned minutes, load and zones, what was done (minutes, load, time in
 * zones, RPE), the deviation's facts as Kadence computed them, the
 * rider's class or training profile and the season's phase. No name, no
 * check-ins, no note, no comment; the only words a person wrote are the
 * session's title, fenced as data.
 *
 * The load numbers are there for the model to understand the session,
 * not to repeat: nobody reads load numbers (the amendment of 13 October
 * to ADR 0095), so the prompt asks it to speak in time and effort — how
 * long, how hard against the plan — as the popover does. How the session
 * felt (the RPE) is not dwelt on unless it is far from the plan
 * (`feltFarOff`, the rule the colour follows since 13 October).
 * Pure: imports nothing from the database.
 */

export type CommentPersona =
  | { kind: "youth"; category: Exclude<Category, "senior"> }
  | { kind: "adult"; profile: SeniorProfile };

export type SessionCommentContext = {
  persona: CommentPersona;
  /** DCU's phase for a youth rider ("base_intervals"), the profile's season for an adult ("winter"). */
  phase: string;
  title: string;
  sport: string;
  planned: { minutes: number; load: number | null; zoneMinutes: number[] | null };
  done: {
    minutes: number;
    load: number | null;
    zoneMinutes: { source: "power" | "hr"; minutes: number[] } | null;
    rpe: number | null;
  };
  colour: ComplianceColour;
  facts: DeviationFact[];
  /** The same deviation in words-to-be: the plan's character, the ride's effort and average share of threshold. */
  story?: DeviationStory | null;
  /** The load came from RPE alone and is far from the plan's, so the colour read how it felt (compliance.ts). */
  feltFarOff?: boolean;
};

/** The longest comment shown, in characters: two or three sentences. */
export const COMMENT_MAX_CHARS = 400;

export function personaLine(persona: CommentPersona): string {
  if (persona.kind === "adult")
    return `You are a warm, encouraging cycling coach writing to an adult who rides for fitness and enjoyment, on Kadence's own ${persona.profile === "super-motionist" ? "Supermotionist" : "Motionist"} training profile.`;
  const who =
    persona.category === "youth"
      ? "a young road rider under U17"
      : `a youth road rider in the class ${persona.category}`;
  return `You are a warm, encouraging cycling coach writing to ${who}.`;
}

export function sessionCommentPrompt(context: SessionCommentContext, locale: string): LlmMessage[] {
  const system = [
    personaLine(context.persona),
    "You get one planned session, what was done, and the facts of how the two differ. The facts were computed by the training system from the numbers; take them as they are.",
    'Answer with one JSON object: {"comment": ""}. The comment is two or three short sentences, written to the rider as "you".',
    "Start with something that went well, taken from the numbers. Then say plainly and kindly what differed from the plan. End with one concrete suggestion for next time, offered as a possibility the rider may take or leave.",
    "Never comment on weight, food, body or appearance. Give no medical advice and no diagnosis.",
    "No exclamation marks, no links, no lists, no headings and no emoji.",
    "Use only numbers that are in the data. The load numbers are for you to understand the session: never quote a load number to the reader and do not talk about load at all. Speak in time and effort instead — how long, how hard compared with the plan, and the average share of FTP or threshold heart rate when the data has it. Name zones by their number; use no abbreviations for load, fitness or form.",
    "Speak about time and effort from the measured data: minutes, power, heart rate and time in zones. Do not dwell on how the session felt (the RPE) unless the felt effort is far from the plan, which the data marks with feltFarOff true.",
    "You do not know the rider's name; address them as you.",
    DATA_RULE,
    languageRule(locale),
  ].join(" ");
  const numbers = {
    persona: context.persona,
    phase: context.phase,
    sport: context.sport,
    planned: context.planned,
    done: context.done,
    outcome: context.colour,
    facts: context.facts,
    words: context.story ?? null,
    feltFarOff: context.feltFarOff ?? false,
  };
  const user = [
    "The session's title, as a person wrote it:",
    fenceUntrusted(context.title, 200),
    "The numbers (minutes; zone minutes list zone 1 first; RPE 1–10):",
    JSON.stringify(numbers),
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/** Cut at the last sentence that fits, or the last word, within the cap. */
function cap(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const sentence = Math.max(head.lastIndexOf(". "), head.lastIndexOf("? "));
  if (sentence > max / 3) return head.slice(0, sentence + 1);
  const room = text.slice(0, max - 2);
  const word = room.lastIndexOf(" ");
  return `${room.slice(0, word > 0 ? word : room.length).trimEnd()} …`;
}

/**
 * The model's comment made safe to show: text only — no markup, no links,
 * no emoji, no exclamation marks — on one paragraph, capped. Empty when
 * nothing usable came back.
 */
export function sanitizeComment(data: unknown): string {
  const text = asString(rec(data).comment, "", 4000)
    .replace(/<[^>]*>/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[*_`#>~|]+/g, "")
    .replace(/!+/g, ".")
    .replace(/\.(\s*\.)+/g, ".")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:?])/g, "$1")
    .trim();
  return cap(text, COMMENT_MAX_CHARS);
}
