import type { LlmMessage } from "@/core/llm";
import { LONGEST_RIDE, STRENGTH_PROGRAMMES, type DcuCategory } from "@/modules/dcu";
import { DATA_RULE, fenceUntrusted, languageRule } from "@/modules/ai/prompting";
import type { BikeStructure, StrengthStructure } from "@/modules/workouts/structure";
import type { BuildSport } from "./build-workout-answer";
import { BIKE_GRAMMAR } from "./parse-workout";

/**
 * The prompts behind "Byg med AI" (ADR 0038). DCU's frame for the class
 * the coach chose is written from the numbers Kadence already keeps —
 * the longest ride (src/modules/dcu/rules.ts) and the strength
 * programmes' progressions (src/modules/dcu/strength.ts) — never typed
 * twice. The coach's words and the session already in the builder go in
 * fenced as data. No rider's data goes in at all.
 *
 * Pure: imports nothing from the database.
 */

const COMMON = [
  "Keep exactly what the coach specifies: durations, repetitions, intensities, exercises and equipment. Fill in only what the coach leaves open, with sensible choices for a young rider.",
  "title: a short name for the session, at most 60 characters. description: two or three sentences to the rider on what the session is for and how it should feel, in words a 16-year-old understands.",
  "Never mention the rider's weight, body shape or food.",
];

const BIKE = [
  "You are an experienced Danish youth cycling coach building one bike training session in Kadence from the coach's request.",
  'Answer with one JSON object: {"title": "", "description": "", "steps": [...]}.',
  BIKE_GRAMMAR,
  "Build a whole session: a warm-up, the work the coach asks for and a cool-down, unless the coach says otherwise. Put a recovery between repetitions of hard work.",
];

const STRENGTH = [
  "You are an experienced Danish youth cycling coach building one strength session for road cyclists in Kadence from the coach's request.",
  'Answer with one JSON object: {"title": "", "description": "", "warmup": "", "minutes": n, "exercises": [{"name": "", "group": "legs"|"core"|"upper"|"mobility"|"other", "sets": n, "reps": "", "load": "", "restSeconds": n, "note": ""}], "progression": []}.',
  'reps is text as a coach writes it: "12", "6-8", "30 s". load is "RM" when the reps are a repetition maximum, a weight such as "20 kg", "kropsvægt", or empty. note: one short line on technique. minutes: how long the whole session takes.',
  'progression only when the coach asks for a programme over several sessions: [{"group": "legs", "from": n, "to": n or null, "sets": n, "reps": "", "load": ""}] means that from session `from` to session `to` that group is done so.',
  "Follow Cycling Denmark's (DCU) strength programmes for young riders: legs and core first, a warm-up of about 8 minutes on a bike, three sets, technique before load, no training to exhaustion in the first six sessions, and about 3 minutes' rest between sets of the legs.",
  "Use only the equipment the coach mentions; when none is mentioned, choose exercises an ordinary fitness centre has. Write exercise names in the language of the answer.",
];

/** DCU's frame for the class, from Kadence's own copy of DCU's numbers. */
export function classLine(sport: BuildSport, category: DcuCategory | null): string | null {
  if (!category) return null;
  if (sport === "bike") {
    const limit = LONGEST_RIDE[category];
    return limit
      ? `The riders are ${category}. DCU says a ${category} rider never rides longer than ${limit.hours} hours or ${limit.km} km in training.`
      : `The riders are ${category}.`;
  }
  const programme = STRENGTH_PROGRAMMES[category].structure.progression;
  const steps = programme
    .map((r) =>
      r.to === null
        ? `from session ${r.from}: ${r.sets} × ${r.reps} ${r.load}`
        : `sessions ${r.from}-${r.to}: ${r.sets} × ${r.reps} ${r.load}`,
    )
    .join("; ");
  return `The riders are ${category}. DCU's programme for ${category} does the legs ${steps}.`;
}

export function buildWorkoutPrompt(input: {
  sport: BuildSport;
  text: string;
  category: DcuCategory | null;
  current: BikeStructure | StrengthStructure | null;
  locale: string;
}): LlmMessage[] {
  const system = [
    ...(input.sport === "bike" ? BIKE : STRENGTH),
    ...COMMON,
    classLine(input.sport, input.category),
    input.current
      ? "The session the coach has built so far is given as JSON. Change it as the coach asks and answer with the whole session, keeping what the coach did not ask to change."
      : null,
    DATA_RULE,
    languageRule(input.locale),
  ]
    .filter((line): line is string => line !== null)
    .join(" ");
  const user = input.current
    ? `The coach asks:\n${fenceUntrusted(input.text, 1500)}\nThe session so far:\n${fenceUntrusted(JSON.stringify(input.current), 10_000)}`
    : fenceUntrusted(input.text, 1500);
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
