import type { Equipment, ExerciseGroup, ExerciseView } from "./types";

/**
 * Finding an exercise in the library and in the programme builder's
 * picker: by part of its name or its how-to, by group, and by what it
 * needs — "none" is the exercises that need nothing but a floor.
 *
 * Pure.
 */

export type ExerciseFilter = {
  query: string;
  group: ExerciseGroup | "all";
  equipment: Equipment | "none" | "all";
};

export const NO_FILTER: ExerciseFilter = { query: "", group: "all", equipment: "all" };

/** Lower case and in one Unicode form, so "Hofte" finds "hoftebøjerstræk" however "ø" was typed. */
function fold(text: string): string {
  return text.toLocaleLowerCase("da").normalize("NFKD");
}

export function matchesFilter(
  exercise: Pick<ExerciseView, "name" | "how" | "group" | "equipment">,
  filter: ExerciseFilter,
): boolean {
  if (filter.group !== "all" && exercise.group !== filter.group) return false;
  if (filter.equipment === "none" && exercise.equipment.length > 0) return false;
  if (
    filter.equipment !== "all" &&
    filter.equipment !== "none" &&
    !exercise.equipment.includes(filter.equipment)
  )
    return false;
  const query = fold(filter.query.trim());
  return !query || fold(exercise.name).includes(query) || fold(exercise.how).includes(query);
}

export function filterExercises<
  T extends Pick<ExerciseView, "name" | "how" | "group" | "equipment">,
>(exercises: readonly T[], filter: ExerciseFilter): T[] {
  return exercises.filter((exercise) => matchesFilter(exercise, filter));
}
