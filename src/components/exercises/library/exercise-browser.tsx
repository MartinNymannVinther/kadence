"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";
import { filterExercises, NO_FILTER } from "@/modules/exercises/filter";
import type { LibraryExercise } from "@/modules/exercises/library";
import { exerciseHref } from "@/modules/exercises/library-paths";
import { ExerciseFilters } from "./exercise-filters";
import { ExerciseTile } from "./exercise-tile";

/**
 * The exercises, the team's first and then Kadence's own, found by name,
 * group and equipment; each opens on its own page.
 */
export function ExerciseBrowser({ exercises }: { exercises: LibraryExercise[] }) {
  const t = useTranslations("exercises.library");
  const [filter, setFilter] = useState(NO_FILTER);
  const shown = filterExercises(exercises, filter);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ExerciseFilters exercises={exercises} value={filter} onChange={setFilter} />
      <p className="sr-only" role="status">
        {t("found", { count: shown.length })}
      </p>
      {shown.length === 0 ? (
        <EmptyState title={t("noMatch")} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((exercise) => (
            <li key={exercise.ref} className="min-w-0">
              <Link
                href={exerciseHref(exercise.ref)}
                className="focus-ring border-border bg-card hover:border-primary/60 block h-full overflow-hidden rounded-xl border shadow-surface transition-colors duration-[120ms] ease-out"
              >
                <ExerciseTile
                  exercise={exercise}
                  team={exercise.team}
                  archived={exercise.archived}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
