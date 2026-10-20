"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EXERCISE_CATALOGUE } from "@/modules/workouts/exercise-catalogue";
import { mergeChoices, type ExerciseChoice } from "@/modules/workouts/exercise-choice";

export type CatalogueOption = ExerciseChoice;

/**
 * The exercises the strength builder suggests, in the reader's language:
 * the library's own (Kadence's and the team's, from /api/exercises/choices),
 * which tie a session's exercise to its figure and how-to, then DCU's
 * exercises by their programme names and the rest of the catalogue
 * (ADR 0044). The library's arrive a moment after the builder opens;
 * until then, and without them, the catalogue is offered as before.
 */
export function useCatalogue(): CatalogueOption[] {
  const t = useTranslations("workouts.catalogue");
  const locale = useLocale();
  const [library, setLibrary] = useState<ExerciseChoice[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/exercises/choices?locale=${encodeURIComponent(locale)}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? (response.json() as Promise<ExerciseChoice[]>) : []))
      .then(setLibrary)
      .catch(() => {
        // Aborted, or offline: the catalogue alone is offered.
      });
    return () => controller.abort();
  }, [locale]);

  return useMemo(
    () =>
      mergeChoices(
        library,
        EXERCISE_CATALOGUE.map((e) => ({
          name: e.name ?? t(`names.${e.key}` as "names.plank"),
          group: e.group,
          sets: e.sets,
          reps: e.reps,
          load: e.loadKey ? t(`loads.${e.loadKey}`) : e.load,
        })),
      ),
    [library, t],
  );
}
