import { z } from "zod";

/**
 * A reference to one exercise: Kadence's own by its id (`builtin:plank`)
 * or a team's own by its row id (`team:<uuid>`). On its own so the
 * workout structure (src/modules/workouts/structure.ts) can carry one on a
 * strength exercise without importing the exercises' contract, which
 * imports the structure's groups — a cycle otherwise.
 *
 * Pure: imports nothing but zod.
 */
export const exerciseRefSchema = z
  .string()
  .regex(/^(builtin:[a-z][a-zA-Z0-9]{1,40}|team:[0-9a-f-]{36})$/);
export type ExerciseRef = z.infer<typeof exerciseRefSchema>;

/**
 * A programme by the same two kinds: `builtin:mobilityDay` or
 * `team:<uuid>` — what the download route and "Læg i kalenderen" are
 * handed.
 */
export const programRefSchema = exerciseRefSchema;
export type ProgramRef = ExerciseRef;
