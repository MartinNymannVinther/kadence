"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { formatDose } from "@/modules/exercises/dose";
import type { Dose, ExerciseView } from "@/modules/exercises/types";
import { cn } from "@/lib/utils";
import { ExerciseFigure } from "./exercise-figure";

/**
 * One exercise as a card (docs/plan-ovelser-og-programmer.md): the figure
 * on a panel a step off the card, "4. Name" with the dose beside it in the
 * accent, how to do it, why in a quieter line, and a "Færdig" toggle that
 * marks the card done on this screen only — nothing is saved.
 *
 * Shared by the open page and the app; the dose is the programme's when
 * the card stands in one.
 */
export function ExerciseCard({
  exercise,
  dose = exercise.dose,
  number,
  className,
}: {
  exercise: ExerciseView;
  dose?: Dose;
  /** Its place in the programme's part, from 1; left out for a card on its own. */
  number?: number;
  className?: string;
}) {
  const t = useTranslations("exercises");
  const [done, setDone] = useState(false);

  return (
    <article
      data-print-keep
      className={cn(
        "bg-card text-card-foreground border-border flex flex-col overflow-hidden rounded-xl border shadow-surface",
        className,
      )}
    >
      <div className="bg-secondary px-4 pt-3 sm:px-6">
        <ExerciseFigure
          pose={exercise.pose}
          label={t("figure.label", { name: exercise.name })}
          className="mx-auto max-w-md"
        />
      </div>
      <div className="flex flex-col gap-2.5 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-heading leading-snug font-semibold">
            {number !== undefined && (
              <span className="text-warning mr-1.5 tabular-nums">{number}.</span>
            )}
            {exercise.name}
          </h3>
          <p className="text-warning text-2sm font-semibold whitespace-nowrap tabular-nums">
            {formatDose(dose, t)}
          </p>
        </div>
        <p className="text-reading leading-relaxed">{exercise.how}</p>
        {exercise.why && <p className="text-meta text-2sm leading-relaxed">{exercise.why}</p>}
        <div className="pt-1.5">
          <button
            type="button"
            aria-pressed={done}
            onClick={() => setDone((d) => !d)}
            className={cn(
              "border-warning inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 px-5 text-sm font-semibold transition-colors duration-[120ms] ease-out sm:min-h-9",
              "focus-visible:outline-ring outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid",
              done ? "bg-warning text-card" : "text-warning hover:bg-warning-tint",
            )}
          >
            {done && <Check aria-hidden className="size-4" />}
            {t("card.done")}
          </button>
        </div>
      </div>
    </article>
  );
}
