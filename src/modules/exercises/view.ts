import { builtinExercise, builtinProgram } from "./builtin";
import type { Translate } from "./dose";
import type { ExerciseRef, ExerciseView, ProgramPart, ProgramView } from "./types";

/**
 * From what is stored to what is shown: an exercise or a programme in the
 * reader's language, ready for the card, the viewer and the download.
 * Pure — the words come through the translator it is handed, so the same
 * functions serve a server page, a client component and a test.
 */

export type { Translate };

/** Kadence's own exercise by its id, or null when there is none by that id. */
export function builtinExerciseView(id: string, t: Translate): ExerciseView | null {
  const exercise = builtinExercise(id);
  if (!exercise) return null;
  const words = `items.${exercise.id}`;
  return {
    ref: `builtin:${exercise.id}`,
    name: t(`${words}.name`),
    how: t(`${words}.how`),
    why: t(`${words}.why`),
    group: exercise.group,
    equipment: exercise.equipment,
    dose: exercise.dose,
    pose: exercise.pose,
  };
}

/** Finds the exercise a reference names; null when it is gone or unknown. */
export type ExerciseLookup = (ref: ExerciseRef) => ExerciseView | null;

const BUILTIN = "builtin:";

/** A lookup for Kadence's own; compose it with one for a team's own (`team:<uuid>`). */
export function builtinLookup(t: Translate): ExerciseLookup {
  return (ref) =>
    ref.startsWith(BUILTIN) ? builtinExerciseView(ref.slice(BUILTIN.length), t) : null;
}

/**
 * A programme's parts with each exercise resolved and its dose decided:
 * the programme's own where it has one, else the exercise's. An exercise
 * the lookup cannot find — a team's own that has been deleted — is left
 * out, and so is a part left empty by that.
 */
export function programParts(
  parts: readonly ProgramPart[],
  lookup: ExerciseLookup,
): ProgramView["parts"] {
  return parts
    .map((part) => ({
      key: part.key,
      items: part.items.flatMap((item) => {
        const exercise = lookup(item.exercise);
        return exercise ? [{ exercise, dose: item.dose ?? exercise.dose }] : [];
      }),
    }))
    .filter((part) => part.items.length > 0);
}

/** Kadence's own programme by its id, or null when there is none by that id. */
export function builtinProgramView(id: string, t: Translate): ProgramView | null {
  const program = builtinProgram(id);
  if (!program) return null;
  return {
    title: t(`programs.${program.id}.name`),
    description: t(`programs.${program.id}.description`),
    parts: programParts(program.parts, builtinLookup(t)),
  };
}
