import type { BuiltinExercise, BuiltinProgram } from "../types";
import { CORE } from "./core";
import { LEGS } from "./legs";
import { MOBILITY } from "./mobility";
import { PROGRAMS } from "./programs";
import { STRENGTH } from "./strength";
import { STRENGTH_STRAPS } from "./strength-straps";
import { STRENGTH_WEIGHTS } from "./strength-weights";
import { UPPER } from "./upper";

/**
 * Kadence's own exercises and programmes (docs/plan-ovelser-og-programmer.md).
 * Adding one is an entry here, its words in messages (`exercises.items.<id>`
 * or `exercises.programs.<id>`) and, for an exercise, a pose; the tests in
 * tests/exercises prove every entry is complete and every programme points
 * at exercises that exist.
 *
 * The ids match the strength builder's catalogue keys where both have the
 * exercise (src/modules/workouts/exercise-catalogue.ts), so one can find
 * the other's drawing.
 */
export const BUILTIN_EXERCISES: readonly BuiltinExercise[] = [
  ...MOBILITY,
  ...CORE,
  ...LEGS,
  ...UPPER,
  ...STRENGTH,
  ...STRENGTH_WEIGHTS,
  ...STRENGTH_STRAPS,
];

export const BUILTIN_PROGRAMS: readonly BuiltinProgram[] = PROGRAMS;

const exercisesById = new Map(BUILTIN_EXERCISES.map((e) => [e.id, e]));
const programsById = new Map(BUILTIN_PROGRAMS.map((p) => [p.id, p]));

export function builtinExercise(id: string): BuiltinExercise | null {
  return exercisesById.get(id) ?? null;
}

export function builtinProgram(id: string): BuiltinProgram | null {
  return programsById.get(id) ?? null;
}
