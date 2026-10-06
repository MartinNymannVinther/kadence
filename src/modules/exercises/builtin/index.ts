import type { BuiltinExercise, BuiltinProgram } from "../types";
import { HIP_FLEXOR } from "./mobility";

/**
 * Kadence's own exercises and programmes (docs/plan-ovelser-og-programmer.md).
 * Adding one is an entry here, its words in messages (`exercises.items.<id>`
 * or `exercises.programs.<id>`) and, for an exercise, a pose; the tests in
 * tests/exercises prove every entry is complete and every programme points
 * at exercises that exist.
 */
export const BUILTIN_EXERCISES: readonly BuiltinExercise[] = [HIP_FLEXOR];

export const BUILTIN_PROGRAMS: readonly BuiltinProgram[] = [];
