import type { LlmMessage } from "@/core/llm";
import { LONGEST_RIDE, STRENGTH_PROGRAMMES } from "@/modules/dcu";
import { DATA_RULE, fenceUntrusted, languageRule } from "@/modules/ai/prompting";
import {
  SENIOR_LONGEST_RIDE,
  isSeniorBasis,
  profileOf,
  strengthProgrammeFor,
  type SeniorBasis,
} from "@/modules/paradigms";
import type {
  BikeStructure,
  ProgressionRule,
  StrengthStructure,
} from "@/modules/workouts/structure";
import type { BuildCategory, BuildSport } from "./build-workout-answer";
import { BIKE_GRAMMAR } from "./parse-workout";

/**
 * The prompts behind "Byg med AI" (ADR 0038). DCU's frame for the class
 * the coach chose is written from the numbers Kadence already keeps —
 * the longest ride (src/modules/dcu/rules.ts) and the strength
 * programmes' progressions (src/modules/dcu/strength.ts) — never typed
 * twice. The coach's words and the session already in the builder go in
 * fenced as data. No rider's data goes in at all. For an adult's training
 * profile (ADR 0092) the words are an adult's — no youth reader, no DCU —
 * and the frame is Kadence's own: the profile's longest ride
 * (src/modules/paradigms/senior.ts) and its strength programme
 * (senior-strength.ts).
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

const SENIOR_COMMON = [
  "Keep exactly what the coach specifies: durations, repetitions, intensities, exercises and equipment. Fill in only what the coach leaves open, with sensible choices for an adult recreational rider.",
  "title: a short name for the session, at most 60 characters. description: two or three sentences to the rider on what the session is for and how it should feel, in plain words.",
  COMMON[2]!,
];

const SENIOR_BIKE = [
  "You are an experienced Danish cycling coach building one bike training session in Kadence for an adult recreational rider, from the coach's request.",
  // The same grammar, without naming DCU's word for the threshold zone.
  ...BIKE.slice(1).map((line) => line.replace("threshold (DCU's AT)", "threshold")),
];

const SENIOR_STRENGTH = [
  "You are an experienced Danish cycling coach building one strength session for an adult recreational road cyclist in Kadence from the coach's request.",
  STRENGTH[1]!,
  STRENGTH[2]!,
  STRENGTH[3]!,
  "Follow Kadence's strength programmes for adults: a warm-up of 5 to 10 minutes, the legs and the trunk first, technique before load, two or three sets, a few jumps for the bones when the rider tolerates them, and start light.",
  STRENGTH[5]!,
];

const progressionText = (rules: ProgressionRule[]) =>
  rules
    .map((r) =>
      r.to === null
        ? `from session ${r.from}: ${r.sets} × ${r.reps} ${r.load}`
        : `sessions ${r.from}-${r.to}: ${r.sets} × ${r.reps} ${r.load}`,
    )
    .join("; ");

/** Kadence's frame for an adult's training profile (ADR 0091, 0092). */
function profileLine(sport: BuildSport, basis: SeniorBasis, guided: boolean): string {
  const profile = profileOf(basis);
  const name = profile === "super-motionist" ? "Supermotionist" : "Motionist";
  const who = `The rider is an adult on Kadence's ${name} training profile.`;
  if (sport === "bike") {
    const limit = SENIOR_LONGEST_RIDE[basis];
    return guided
      ? `${who} Kadence suggests a longest training ride of ${limit.hours} hours or ${limit.km} km for the profile.`
      : who;
  }
  const programme = strengthProgrammeFor(profile);
  return `${who} Kadence's "${programme.name.en}" programme does the legs ${progressionText(programme.structure.progression.filter((r) => r.group === "legs"))}.`;
}

/**
 * DCU's frame for the class, from Kadence's own copy of DCU's numbers. A
 * team that plans without DCU (ADR 0049) is told the class and not DCU's
 * longest ride; DCU's strength programmes are library content and stay.
 */
export function classLine(
  sport: BuildSport,
  category: BuildCategory | null,
  guided = true,
): string | null {
  if (!category) return null;
  if (isSeniorBasis(category)) return profileLine(sport, category, guided);
  if (sport === "bike") {
    const limit = guided ? LONGEST_RIDE[category] : null;
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
  category: BuildCategory | null;
  current: BikeStructure | StrengthStructure | null;
  locale: string;
  /** Whether the team plans by DCU (ADR 0049); true unless said otherwise. */
  guided?: boolean;
}): LlmMessage[] {
  const adult = isSeniorBasis(input.category);
  const system = [
    ...(input.sport === "bike" ? (adult ? SENIOR_BIKE : BIKE) : adult ? SENIOR_STRENGTH : STRENGTH),
    ...(adult ? SENIOR_COMMON : COMMON),
    classLine(input.sport, input.category, input.guided ?? true),
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
