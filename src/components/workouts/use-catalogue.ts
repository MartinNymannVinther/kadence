"use client";

import { useTranslations } from "next-intl";
import { EXERCISE_CATALOGUE } from "@/modules/workouts/exercise-catalogue";
import type { ExerciseGroup } from "@/modules/workouts/structure";

export type CatalogueOption = {
  name: string;
  group: ExerciseGroup;
  sets: number;
  reps: string;
  load: string;
};

/**
 * The exercise catalogue (ADR 0044) in the reader's language: DCU's
 * exercises by their programme names, Kadence's own named and loaded
 * from `workouts.catalogue`.
 */
export function useCatalogue(): CatalogueOption[] {
  const t = useTranslations("workouts.catalogue");
  return EXERCISE_CATALOGUE.map((e) => ({
    name: e.name ?? t(`names.${e.key}` as "names.plank"),
    group: e.group,
    sets: e.sets,
    reps: e.reps,
    load: e.loadKey ? t(`loads.${e.loadKey}`) : e.load,
  }));
}
