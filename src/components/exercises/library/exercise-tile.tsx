"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatDose } from "@/modules/exercises/dose";
import type { ExerciseView } from "@/modules/exercises/types";
import { cn } from "@/lib/utils";
import { ExerciseFigure } from "../exercise-figure";

/**
 * An exercise small: its figure on the panel, its name, its group and
 * dose. The caller makes it a link or a button and says what it is.
 */
export function ExerciseTile({
  exercise,
  team = false,
  archived = false,
  className,
}: {
  exercise: ExerciseView;
  team?: boolean;
  archived?: boolean;
  className?: string;
}) {
  const t = useTranslations("exercises");

  return (
    <span className={cn("flex min-w-0 flex-col", className)}>
      {/* The name follows; the drawing would only say it twice. */}
      <span aria-hidden className="bg-secondary block rounded-t-[11px] px-3 pt-2">
        <ExerciseFigure pose={exercise.pose} label={t("figure.label", { name: exercise.name })} />
      </span>
      <span className="flex min-w-0 flex-col gap-1 px-3 py-2.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-2sm min-w-0 font-semibold break-words">{exercise.name}</span>
          {team && <Badge variant="secondary">{t("library.team")}</Badge>}
          {archived && <Badge variant="outline">{t("library.archived")}</Badge>}
        </span>
        <span className="text-meta text-xs">
          {t(`groups.${exercise.group}`)} ·{" "}
          <span className="text-warning font-medium tabular-nums">
            {formatDose(exercise.dose, t)}
          </span>
        </span>
      </span>
    </span>
  );
}
