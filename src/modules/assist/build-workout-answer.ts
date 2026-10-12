import type { DcuCategory } from "@/modules/dcu";
import { LONGEST_RIDE } from "@/modules/dcu";
import {
  SENIOR_LONGEST_RIDE,
  isSeniorBasis,
  profileOf,
  type SeniorBasis,
  type SeniorProfile,
} from "@/modules/paradigms";
import { asString, list, rec } from "@/modules/ai/sanitize-helpers";
import {
  EXERCISE_GROUPS,
  exerciseSchema,
  progressionRuleSchema,
  structureMinutes,
  type BikeStructure,
  type Exercise,
  type ExerciseGroup,
  type ProgressionRule,
  type StrengthStructure,
} from "@/modules/workouts/structure";
import { sanitizeParsed } from "./parse-workout";

/**
 * What "Byg med AI" shows (ADR 0038): a session the builder can hold, a
 * name and a word to the rider, and the guardrails' notes on it. A model's
 * answer reaches the screen only through these readers — every field
 * coerced or dropped, every structure checked by the builder's own schema
 * — and a note is shown, never enforced.
 *
 * Pure: imports nothing from the database.
 */

export type BuildSport = "bike" | "strength";

/** Who the session is for: one of DCU's classes, or an adult's training profile (ADR 0092). */
export type BuildCategory = DcuCategory | SeniorBasis;

/**
 * A guardrail's word on a proposal: the session goes past DCU's longest
 * ride for the class, or past the longest ride Kadence suggests for an
 * adult's profile (ADR 0091).
 */
export type WorkoutNote =
  | { kind: "longestRide"; category: DcuCategory; hours: number }
  | { kind: "longestRideProfile"; profile: SeniorProfile; hours: number };

export type BuiltWorkout = {
  /** Empty when the rules read the coach's shorthand: they make no name. */
  title: string;
  description: string;
  structure: BikeStructure | StrengthStructure;
  notes: WorkoutNote[];
  via: "rules" | "model";
};

const MAX_EXERCISES = 30;
const MAX_RULES = 30;

const oneLine = (v: unknown, max: number) => asString(v, "", max).replace(/\s+/g, " ");

function whole(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function group(v: unknown): ExerciseGroup {
  return EXERCISE_GROUPS.find((g) => g === v) ?? "other";
}

/** "12", 12 and "6-8" all read as a coach writes reps. */
function reps(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(Math.round(v));
  return oneLine(v, 20);
}

function exercise(v: unknown): Exercise | null {
  const r = rec(v);
  const rest = whole(r.restSeconds, 0, 900);
  const parsed = exerciseSchema.safeParse({
    name: oneLine(r.name, 80),
    group: group(r.group),
    sets: whole(r.sets, 1, 10) ?? 3,
    reps: reps(r.reps),
    load: oneLine(r.load, 40),
    ...(rest === null ? {} : { restSeconds: rest }),
    note: oneLine(r.note, 300),
  });
  return parsed.success ? parsed.data : null;
}

function progressionRule(v: unknown): ProgressionRule | null {
  const r = rec(v);
  const parsed = progressionRuleSchema.safeParse({
    group: group(r.group),
    from: whole(r.from, 1, 200),
    to: r.to === null || r.to === undefined ? null : whole(r.to, 1, 200),
    sets: whole(r.sets, 1, 10),
    reps: reps(r.reps),
    load: oneLine(r.load, 40),
  });
  if (!parsed.success) return null;
  const rule = parsed.data;
  return rule.to !== null && rule.to < rule.from ? null : rule;
}

/** A strength session from the model, or null when no exercise survives. */
export function sanitizeStrength(data: unknown): StrengthStructure | null {
  const r = rec(data);
  const exercises = list(r.exercises)
    .map(exercise)
    .filter((e): e is Exercise => e !== null)
    .slice(0, MAX_EXERCISES);
  if (exercises.length === 0) return null;
  const progression = list(r.progression)
    .map(progressionRule)
    .filter((p): p is ProgressionRule => p !== null)
    .slice(0, MAX_RULES);
  return {
    kind: "strength",
    warmup: asString(r.warmup, "", 500),
    exercises,
    progression,
    minutes: whole(r.minutes, 10, 300) ?? 60,
  };
}

/** The guardrails' notes: shown under the proposal, never a reason to refuse it. */
export function workoutNotes(
  structure: BikeStructure | StrengthStructure,
  category: BuildCategory | null,
  /** A team that plans without DCU (ADR 0049) gets no note about DCU's longest ride. */
  guided = true,
): WorkoutNote[] {
  if (!guided || !category || structure.kind !== "bike") return [];
  if (isSeniorBasis(category)) {
    const hours = SENIOR_LONGEST_RIDE[category].hours;
    if (structureMinutes(structure) <= hours * 60) return [];
    return [{ kind: "longestRideProfile", profile: profileOf(category), hours }];
  }
  const limit = LONGEST_RIDE[category];
  if (!limit || structureMinutes(structure) <= limit.hours * 60) return [];
  return [{ kind: "longestRide", category, hours: limit.hours }];
}

/** The model's whole answer for a sport, or null when it is not a session. */
export function sanitizeBuilt(
  sport: BuildSport,
  data: unknown,
  category: BuildCategory | null,
  guided = true,
): BuiltWorkout | null {
  const structure = sport === "bike" ? sanitizeParsed(data) : sanitizeStrength(data);
  if (!structure) return null;
  const r = rec(data);
  return {
    title: oneLine(r.title, 120),
    description: asString(r.description, "", 1000),
    structure,
    notes: workoutNotes(structure, category, guided),
    via: "model",
  };
}
