"use client";

import { useTranslations } from "next-intl";
import { ItemActions } from "@/components/workouts/item-actions";
import { Badge } from "@/components/ui/badge";
import { formatDose } from "@/modules/exercises/dose";
import type { LibraryExercise } from "@/modules/exercises/library";
import type { DraftItem } from "@/modules/exercises/program-draft";
import type { Dose } from "@/modules/exercises/types";
import { ExerciseFigure } from "../exercise-figure";
import { DoseFields } from "../editor/dose-fields";

/**
 * One exercise in a part: its figure small, its name and dose, moved up
 * and down or taken out with buttons (never by dragging alone), and the
 * programme's own dose when the coach wants another than the exercise's.
 */
export function ItemRow({
  item,
  exercise,
  index,
  count,
  onMove,
  onRemove,
  onDose,
}: {
  item: DraftItem;
  /** The exercise the item names; missing when it no longer exists. */
  exercise: LibraryExercise | undefined;
  index: number;
  count: number;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
  onDose: (dose: Dose | undefined) => void;
}) {
  const t = useTranslations("exercises");
  const name = exercise?.name ?? item.exercise;
  const own = item.dose !== undefined;

  return (
    <li className="border-border bg-card flex min-w-0 flex-col gap-2 rounded-lg border p-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="text-warning w-5 shrink-0 text-right text-2sm font-semibold tabular-nums">
          {index + 1}.
        </span>
        {exercise && (
          <span
            aria-hidden
            className="bg-secondary hidden w-16 shrink-0 rounded-md px-1 pt-0.5 sm:block"
          >
            <ExerciseFigure pose={exercise.pose} label={exercise.name} />
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-2sm font-semibold break-words">{name}</span>
            {exercise?.archived && <Badge variant="outline">{t("library.archived")}</Badge>}
          </span>
          {exercise && (
            <span className="text-meta text-xs tabular-nums">
              {own
                ? formatDose(item.dose!, t)
                : t("builder.exerciseDose", { dose: formatDose(exercise.dose, t) })}
            </span>
          )}
        </span>
        <ItemActions name={name} index={index} count={count} onMove={onMove} onRemove={onRemove} />
      </div>
      {exercise && (
        <div className="flex min-w-0 flex-col gap-2 pl-7">
          <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-2sm sm:min-h-8">
            <input
              type="checkbox"
              className="accent-primary size-4"
              checked={own}
              onChange={(e) => onDose(e.target.checked ? exercise.dose : undefined)}
            />
            {t("builder.ownDose")}
          </label>
          {own && (
            <DoseFields
              value={item.dose!}
              onChange={onDose}
              legend={t("builder.ownDose")}
              hideLegend
            />
          )}
        </div>
      )}
    </li>
  );
}
