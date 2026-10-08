import { exerciseRefSchema, type ExerciseRef } from "./ref";

/**
 * Where an exercise or a programme lives in the app's library, and back:
 * Kadence's own by its id (`/library/programs/mobilityDay`), a team's own
 * by its row id (`/library/programs/<uuid>`). The two never meet: a
 * built-in id starts with a letter and has no dashes, a row id is a uuid.
 *
 * Pure.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The reference a path's id names, or null when it names neither kind. */
export function refFromParam(param: string): ExerciseRef | null {
  const ref = UUID.test(param) ? `team:${param}` : `builtin:${param}`;
  return exerciseRefSchema.safeParse(ref).success ? ref : null;
}

/** The id a path carries for a reference: what follows the colon. */
export function paramOf(ref: ExerciseRef): string {
  return ref.slice(ref.indexOf(":") + 1);
}

export const exerciseHref = (ref: ExerciseRef) => `/library/exercises/${paramOf(ref)}`;
export const programHref = (ref: ExerciseRef) => `/library/programs/${paramOf(ref)}`;

/**
 * The programme as a file to keep or print, from the download route the
 * open guide shares (Ø-02, src/app/api/programs/download).
 */
export function downloadHref(ref: ExerciseRef, locale: string): string {
  const query = new URLSearchParams({ program: ref, locale });
  return `/api/programs/download?${query.toString()}`;
}
