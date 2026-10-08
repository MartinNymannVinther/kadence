import type { LlmMessage } from "@/core/llm";
import { DATA_RULE, fenceUntrusted, languageRule } from "@/modules/ai/prompting";
import { classLine } from "@/modules/assist/build-workout-prompt";
import type { DcuCategory } from "@/modules/dcu";
import type { ProgramDraft } from "../program-draft";
import type { Turn } from "./answer";

/**
 * The prompt behind a turn of "Byg med AI" for a programme (ADR 0071).
 * The model gets the library as lines, the programme as it stands in the
 * builder, the turns before this one and the coach's new words — every
 * one of them fenced as data — and answers with a word to the coach and
 * the whole programme as it should now stand. DCU's frame for the class
 * comes from Kadence's own numbers (classLine, ADR 0038), never typed
 * twice. No rider's data goes in.
 *
 * Pure: imports nothing from the database.
 */

/** The turns the model is reminded of; the programme in the builder carries the rest. */
export const MAX_TURNS = 8;
const MAX_TURN_CHARS = 1500;
const MAX_CATALOGUE_CHARS = 24_000;
const MAX_DRAFT_CHARS = 10_000;

const SYSTEM = [
  "You are an experienced Danish youth cycling coach composing one training programme off the bike — stretches, core, strength, mobility — in Kadence, together with the coach, from the exercises in Kadence's library and nothing else.",
  'Answer with one JSON object: {"reply": "", "program": {"name": "", "description": "", "parts": [{"key": "", "items": [{"exercise": "", "dose": {}}]}]} or null}.',
  "reply: two or three sentences to the coach — what you changed and why, or the answer to their question. Name a change so the coach can find it. No lists, no markup.",
  "program: the whole programme as it should stand after this turn, keeping everything the coach did not ask to change; null when the coach only asked something and nothing should change. name: at most 60 characters. description: one or two sentences to the rider, at most 300 characters.",
  "parts: in the order they are done. key is one of any, morning, midday, evening, before, after, each at most once: `any` for a programme done at one time, `before` and `after` for one round a ride, `morning`, `midday` and `evening` for one spread over the day. A programme is usually 5 to 12 exercises; never more than 20 in a part.",
  'items: exercise is a reference from the library, exactly as listed. dose is optional — {"kind": "time", "seconds": n, "sets": n, "perSide": true|false, "load": "light"|"moderate"|"heavy"} or {"kind": "reps", "reps": n, "sets": n, "perSide": true|false, "load": ...} — and left out to use the exercise\'s own. load only for an exercise with a weight.',
  "Use only the library. When the coach asks for an exercise the library lacks, say so in reply and choose the nearest the library has. Respect the equipment the coach has; when none is mentioned, prefer exercises without equipment.",
  "Technique before load; a young rider never lifts to exhaustion; at least 48 hours between two strength sessions; stretches after, not before, hard work.",
  "Never mention the rider's weight, body shape or food. No rider's data is given, and none is to be assumed.",
];

function turnsBlock(turns: readonly Turn[]): string {
  return turns
    .slice(-MAX_TURNS)
    .map(
      (turn) => `${turn.role === "coach" ? "Coach" : "You"}: ${turn.text.slice(0, MAX_TURN_CHARS)}`,
    )
    .join("\n");
}

export function buildProgramPrompt(input: {
  catalogue: readonly string[];
  draft: ProgramDraft;
  turns: readonly Turn[];
  text: string;
  category: DcuCategory | null;
  locale: string;
  /** Whether the team plans by DCU (ADR 0049); true unless said otherwise. */
  guided?: boolean;
}): LlmMessage[] {
  const system = [
    ...SYSTEM,
    classLine("strength", input.category, input.guided ?? true),
    DATA_RULE,
    languageRule(input.locale),
  ]
    .filter((line): line is string => line !== null)
    .join(" ");
  const hasDraft = input.draft.parts.some((part) => part.items.length > 0);
  const user = [
    `The library, one exercise per line as reference | name | group | equipment | its own dose:\n${fenceUntrusted(input.catalogue.join("\n"), MAX_CATALOGUE_CHARS)}`,
    hasDraft
      ? `The programme as it stands in the builder:\n${fenceUntrusted(JSON.stringify(input.draft), MAX_DRAFT_CHARS)}`
      : "The builder is empty.",
    input.turns.length > 0
      ? `Earlier in this conversation:\n${fenceUntrusted(turnsBlock(input.turns), MAX_TURNS * MAX_TURN_CHARS)}`
      : null,
    `The coach now says:\n${fenceUntrusted(input.text, MAX_TURN_CHARS)}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
