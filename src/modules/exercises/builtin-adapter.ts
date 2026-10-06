import { BUILTIN_EXERCISES } from "./builtin";
import type { BuiltinExercise, ExerciseView } from "./types";

/**
 * A translator for the `exercises` namespace of messages, from next-intl on
 * the server (`getTranslations("exercises")`, wrapped as `(key) => t(key)`)
 * or `createTranslator` in a test.
 */
export type Translate = (key: string) => string;

/** Kadence's own exercise by its id, or undefined when there is none by that id. */
export function findBuiltinExercise(id: string): BuiltinExercise | undefined {
  return BUILTIN_EXERCISES.find((exercise) => exercise.id === id);
}

/**
 * Kadence's own exercise as the reader sees it, its words from
 * `exercises.items.<id>`.
 *
 * A stand-in written by the slice that keeps the team's own (Ø-03), so a
 * programme mixing both kinds resolves before the built-in slice (Ø-01)
 * lands its own view beside the built-in exercises. When both are merged,
 * the callers here import that one and this function goes.
 */
export function builtinExerciseView(exercise: BuiltinExercise, t: Translate): ExerciseView {
  const key = `items.${exercise.id}`;
  return {
    ref: `builtin:${exercise.id}`,
    name: t(`${key}.name`),
    how: t(`${key}.how`),
    why: t(`${key}.why`),
    group: exercise.group,
    equipment: exercise.equipment,
    dose: exercise.dose,
    pose: exercise.pose,
  };
}
