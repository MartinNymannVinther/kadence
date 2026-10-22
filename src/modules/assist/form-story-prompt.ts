import type { LlmMessage } from "@/core/llm";
import { DATA_RULE, fenceUntrusted, languageRule } from "@/modules/ai/prompting";
import { asString, rec } from "@/modules/ai/sanitize-helpers";
import type { Severity } from "@/modules/load";
import { personaLine, type CommentPersona } from "./session-comment-prompt";

/**
 * The words around "Forklar formen med AI" (docs/adr/0108): the prompt
 * for a prose reading of a rider's form chart and what else Kadence
 * knows about their training, and the sanitizer its answer passes
 * before anybody sees it.
 *
 * The model gets numbers Kadence computed, summarised: the curve at a
 * few points, the weeks' hours against the range, the forecast, the open
 * attention points, the wellbeing zone, the thresholds, the records and
 * the goals. No check-in text, no note, no comment; the only words a
 * person wrote are goal and race titles, and they travel inside the
 * data fence with everything else. The rider's first name is given only
 * when a coach reads the story, as the Monday brief does (ADR 0017).
 *
 * Pure: imports nothing from the database. The context is built in
 * form-story-context.ts and read in form-story.ts.
 */

export type StoryReader = { kind: "rider" } | { kind: "coach"; firstName: string };

export type CurvePoint = { date: string; fitness: number; fatigue: number; form: number };

export type StoryWeek = {
  monday: string;
  bikeHours: number;
  hours: number;
  sessions: number;
  /** The current week only: bike hours still planned. */
  plannedBikeHours?: number;
};

export type FormStoryContext = {
  reader: StoryReader;
  persona: CommentPersona;
  /** DCU's phase for a youth rider, the profile's season for an adult. */
  phase: string;
  today: string;
  curve: {
    today: CurvePoint | null;
    fourWeeksAgo: CurvePoint | null;
    eightWeeksAgo: CurvePoint | null;
    peakFitness: CurvePoint | null;
    lowestForm: CurvePoint | null;
    trainingDaysLast28: number;
    restDaysLast7: number;
  };
  weeks: StoryWeek[];
  /** The recommended range of bike hours for this week, when the team plans by one. */
  range: { low: number; target: number; high: number; source: string } | null;
  forecast: {
    days: number;
    end: CurvePoint;
    race: { title: string; date: string; priority: "A" | "B"; form: number } | null;
  } | null;
  attention: Array<{ kind: string; severity: Severity; values: Record<string, number | string> }>;
  wellbeing: { zone: "green" | "yellow" | "red" | null; yellowDaysLast21: number } | null;
  thresholds: {
    ftpWatts: number | null;
    thresholdHr: number | null;
    maxHr: number | null;
    restingHr: number | null;
    setOn: string | null;
  };
  records: {
    thisYear: Array<{ seconds: number; watts: number; date: string }>;
    thisMonth: Array<{ seconds: number; watts: number; date: string }>;
    longestKm: { value: number; date: string } | null;
    longestHours: { value: number; date: string } | null;
  };
  goals: Array<{
    title: string;
    kind: string;
    target: number;
    done: number;
    startsOn: string;
    endsOn: string;
  }>;
};

/** The longest story shown, in characters: three or four short paragraphs. */
export const STORY_MAX_CHARS = 1800;
/** Room for the data; the fence caps it, so the context stays compact by construction. */
export const STORY_DATA_CHARS = 9000;

function readerLine(context: FormStoryContext): string {
  if (context.reader.kind === "rider")
    return `${personaLine(context.persona)} The reader is the rider; write to them as "you".`;
  const who =
    context.persona.kind === "adult"
      ? "an adult who rides for fitness and enjoyment"
      : context.persona.category === "youth"
        ? "a young road rider under U17"
        : `a youth road rider in the class ${context.persona.category}`;
  return `You are a warm, experienced cycling coach writing to a colleague: the coach of ${who}. The rider's first name is ${context.reader.firstName}; speak of them by it, in the third person.`;
}

export function formStoryPrompt(context: FormStoryContext, locale: string): LlmMessage[] {
  const system = [
    readerLine(context),
    "You get what Kadence, a training planner, knows about the rider, as numbers it computed: the 90-day curve of fitness (the 42-day average of daily training load), fatigue (the 7-day average) and freshness (fitness minus fatigue) at a few points; the weeks' hours on the bike and the recommended range for this week; where the curve heads if the planned sessions are ridden, and the next race if there is one; the open attention points the system raised; the wellbeing zone from the rider's check-ins; the thresholds; the records; and the goals.",
    'Answer with one JSON object: {"story": ""}. The story is three or four short paragraphs separated by a blank line, in plain prose.',
    "First, what the curve shows right now and how the recent weeks got it there. Second, where it is heading if the plan is ridden, and what that means for the race if there is one. Third, what the rest of the data says — the hours against the range, the thresholds, the records, the goals — with one thing to be glad about taken from the numbers. Last, one possibility for the coming week, offered as something the reader may take or leave, never an order.",
    "Call the three curves fitness, fatigue and freshness in English and kondition, træthed and friskhed in Danish. Never use TrainingPeaks' abbreviations for them or for load, and never the phrase training stress.",
    "You may quote the three numbers of the curve, hours, kilometres, watts and heart rates. Do not quote the load of single sessions or weeks; speak of hours and effort instead.",
    "Use only numbers that are in the data and invent nothing. Where something is missing — no thresholds, no goals, no check-ins — you may say so plainly, as something that could be added, never as a fault.",
    "Never comment on weight, food, body or appearance. Give no medical advice and no diagnosis. If the wellbeing zone is yellow or red, or an attention point concerns pain, sleep or wellbeing, suggest a conversation with the coach, a parent or a professional, and never suggest training through it.",
    "Write as a helpful colleague who respects that the reader decides: possibilities rather than orders, plainly and positively rather than as negations.",
    "No exclamation marks, no headings, no lists, no links and no emoji.",
    DATA_RULE,
    languageRule(locale),
  ].join(" ");
  const data = {
    today: context.today,
    persona: context.persona,
    phase: context.phase,
    curve: context.curve,
    weeks: context.weeks,
    rangeThisWeek: context.range,
    ifPlanIsRidden: context.forecast,
    attentionPoints: context.attention,
    wellbeing: context.wellbeing,
    thresholds: context.thresholds,
    records: context.records,
    goals: context.goals,
  };
  const user = [
    "What Kadence knows (hours to one decimal; records as seconds and watts; goal and race titles were written by people):",
    fenceUntrusted(JSON.stringify(data), STORY_DATA_CHARS),
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/** Cut at the last paragraph or sentence that fits, or the last word, within the cap. */
function cap(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const paragraph = head.lastIndexOf("\n\n");
  if (paragraph > max / 2) return head.slice(0, paragraph);
  const sentence = Math.max(head.lastIndexOf(". "), head.lastIndexOf("? "));
  if (sentence > max / 3) return head.slice(0, sentence + 1);
  const room = text.slice(0, max - 2);
  const word = room.lastIndexOf(" ");
  return `${room.slice(0, word > 0 ? word : room.length).trimEnd()} …`;
}

/**
 * The model's story made safe to show: text only — no markup, no links,
 * no emoji, no exclamation marks, no list marks — in paragraphs separated
 * by one blank line, capped. Empty when nothing usable came back.
 */
export function sanitizeStory(data: unknown): string {
  const text = asString(rec(data).story, "", 8000)
    .replace(/\r\n?/g, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/^[ \t]*(?:[-*•]|\d+[.)])[ \t]+/gm, "")
    .replace(/[*_`#>~|]+/g, "")
    .replace(/!+/g, ".")
    .replace(/\.(\s*\.)+/g, ".")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([.,;:?])/g, "$1")
    .trim();
  return cap(text, STORY_MAX_CHARS);
}
