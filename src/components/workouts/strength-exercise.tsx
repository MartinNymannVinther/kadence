"use client";

import { useTranslations } from "next-intl";
import { ExerciseFigure } from "@/components/exercises/exercise-figure";
import { Link } from "@/i18n/navigation";
import { exerciseHref } from "@/modules/exercises/library-paths";
import type { ExerciseView } from "@/modules/exercises/types";
import type { Exercise } from "@/modules/workouts/structure";
import { StrengthLog } from "./strength-log";

/**
 * One exercise of a strength session: its name, group, rest and note
 * beside the sets and reps — and, when it is one of the library's and the
 * reader may see that exercise, its figure and how to do it below, with
 * the way to the whole exercise in the library (docs/plan-ovelser-og-
 * programmer.md). The name stays the one the session was planned with.
 * On paper the link gives way to a box for every set (strength-log.tsx).
 */
export function StrengthExercise({
  exercise,
  view,
}: {
  exercise: Exercise;
  /** The library's exercise its `ref` names, when this reader may see it. */
  view?: ExerciseView;
}) {
  const t = useTranslations("workouts.view");
  const groups = useTranslations("workouts.group");
  const figures = useTranslations("exercises");

  return (
    <li className="flex flex-col gap-2.5 px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="flex min-w-0 flex-col">
          <span className="text-2sm font-medium">{exercise.name}</span>
          <span className="text-meta text-xs">
            {groups(exercise.group)}
            {exercise.restSeconds ? ` · ${t("rest", { seconds: exercise.restSeconds })}` : ""}
            {exercise.note ? ` · ${exercise.note}` : ""}
          </span>
        </span>
        <span className="text-2sm font-semibold tabular-nums">
          {t("setsReps", { sets: exercise.sets, reps: exercise.reps })}
          {exercise.load ? <span className="text-meta font-normal"> · {exercise.load}</span> : null}
        </span>
      </div>
      {view && (
        <div className="grid min-w-0 gap-3 pb-1 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-start print:grid-cols-[9rem_minmax(0,1fr)] print:pb-0">
          <div className="bg-secondary max-w-xs rounded-md px-2 pt-1 print:max-w-36">
            <ExerciseFigure
              pose={view.pose}
              label={figures("figure.label", { name: exercise.name })}
            />
          </div>
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <p className="text-2sm leading-relaxed">{view.how}</p>
            <Link
              href={exerciseHref(view.ref)}
              className="focus-ring text-primary text-2sm font-medium underline-offset-4 hover:underline print:hidden"
            >
              {t("openInLibrary")}
            </Link>
          </div>
        </div>
      )}
      <StrengthLog exercise={exercise} />
    </li>
  );
}
