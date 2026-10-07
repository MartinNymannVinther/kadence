"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDose } from "@/modules/exercises/dose";
import { filterExercises, NO_FILTER } from "@/modules/exercises/filter";
import type { LibraryExercise } from "@/modules/exercises/library";
import type { ExerciseRef } from "@/modules/exercises/types";
import { ExerciseFigure } from "../exercise-figure";
import { ExerciseFilters } from "../library/exercise-filters";

/**
 * "Tilføj øvelse": Kadence's own and the team's own (not archived), found
 * by name, group and equipment. Each press adds one to the part and the
 * dialog stays open, so a coach can add several in a row.
 */
export function ExercisePicker({
  open,
  onOpenChange,
  exercises,
  partName,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: LibraryExercise[];
  /** The part the exercises go into, as the coach reads it. */
  partName: string;
  onPick: (ref: ExerciseRef) => void;
}) {
  const t = useTranslations("exercises");
  const common = useTranslations("common");
  const [filter, setFilter] = useState(NO_FILTER);
  const [added, setAdded] = useState("");
  const choices = exercises.filter((e) => !e.archived);
  const shown = filterExercises(choices, filter);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("builder.pickerTitle")}</DialogTitle>
          <DialogDescription>{t("builder.pickerHint", { part: partName })}</DialogDescription>
        </DialogHeader>
        <ExerciseFilters exercises={choices} value={filter} onChange={setFilter} />
        <p className="text-primary min-h-5 text-2sm font-medium" role="status">
          {added && t("builder.added", { name: added })}
        </p>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {shown.length === 0 ? (
            <EmptyState variant="inline" title={t("library.noMatch")} />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {shown.map((exercise) => (
                <li key={exercise.ref} className="min-w-0">
                  <button
                    type="button"
                    aria-label={t("builder.pick", { name: exercise.name })}
                    className="focus-ring border-border bg-card hover:border-primary/60 flex min-h-11 w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors duration-[120ms] ease-out"
                    onClick={() => {
                      onPick(exercise.ref);
                      setAdded(exercise.name);
                    }}
                  >
                    <span aria-hidden className="bg-secondary w-20 shrink-0 rounded-md px-1 pt-0.5">
                      <ExerciseFigure pose={exercise.pose} label={exercise.name} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-2sm font-semibold break-words">{exercise.name}</span>
                      <span className="text-meta text-xs">
                        {t(`groups.${exercise.group}`)} · {formatDose(exercise.dose, t)}
                        {exercise.team && ` · ${t("library.team")}`}
                      </span>
                    </span>
                    <Plus aria-hidden className="text-primary size-4 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="max-sm:h-11"
            onClick={() => onOpenChange(false)}
          >
            {common("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
