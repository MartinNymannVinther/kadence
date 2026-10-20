import type { ExerciseRef } from "@/modules/exercises/ref";
import type { Exercise, ExerciseGroup } from "./structure";

/**
 * What the strength builder offers while a name is typed, and what
 * choosing one does. The library's exercises (Kadence's own and the
 * team's) come with their reference, so a session written with one shows
 * its figure and how-to, and links to it, just as a programme laid in
 * does; DCU's and the short catalogue's come without (ADR 0044).
 *
 * Pure: imports nothing from the database.
 */

export type ExerciseChoice = {
  name: string;
  group: ExerciseGroup;
  sets: number;
  reps: string;
  load: string;
  ref?: ExerciseRef;
};

/** The library's first; then the catalogue's whose names the library does not already hold. */
export function mergeChoices(
  library: readonly ExerciseChoice[],
  catalogue: readonly ExerciseChoice[],
): ExerciseChoice[] {
  const names = new Set(library.map((choice) => choice.name));
  return [...library, ...catalogue.filter((choice) => !names.has(choice.name))];
}

/** A new exercise as the builder starts it (src/components/workouts/defaults.ts). */
function untouched(exercise: Exercise): boolean {
  return (
    exercise.group === "legs" &&
    exercise.sets === 3 &&
    exercise.reps === "12" &&
    exercise.load === ""
  );
}

/**
 * The exercise under a new name. A name among the choices fills group,
 * sets, reps and load while those are still the new exercise's, and ties
 * the exercise to the library when the choice is the library's — or
 * unties it, when the choice is one of DCU's. A name among none of them
 * keeps the tie as it was: a coach who writes "Kat og ko, langsomt" still
 * means the library's cat-cow, and the editor shows the tie to undo.
 */
export function renamed(
  exercise: Exercise,
  name: string,
  choices: readonly ExerciseChoice[],
): Exercise {
  const known = choices.find((choice) => choice.name === name);
  const { ref: previous, ...rest } = exercise;
  const ref = known ? known.ref : previous;
  const next =
    known && untouched(exercise)
      ? {
          ...rest,
          name,
          group: known.group,
          sets: known.sets,
          reps: known.reps,
          load: known.load,
        }
      : { ...rest, name };
  return ref ? { ...next, ref } : next;
}

/** The exercise without its tie to the library: a name of the coach's own. */
export function untied(exercise: Exercise): Exercise {
  const { ref: _ref, ...rest } = exercise;
  return rest;
}
