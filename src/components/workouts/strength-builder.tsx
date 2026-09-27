"use client";

import { useId } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { StrengthStructure } from "@/modules/workouts/structure";
import { newExercise } from "./defaults";
import { ExerciseEditor } from "./exercise-editor";
import { ItemActions } from "./item-actions";
import { duplicateItem, moveItem, removeItem, replaceItem } from "./list-ops";
import { NumberField } from "./number-field";
import { ProgressionEditor } from "./progression-editor";

/**
 * A strength session or programme: the warm-up in words, how long it
 * takes, the exercises in order, and — for a programme — how sets and
 * reps change from session to session.
 */
export function StrengthBuilder({
  structure,
  onChange,
}: {
  structure: StrengthStructure;
  onChange: (structure: StrengthStructure) => void;
}) {
  const t = useTranslations("workouts.strength");
  const warmupId = useId();
  const exercises = structure.exercises;
  const setExercises = (next: StrengthStructure["exercises"]) =>
    onChange({ ...structure, exercises: next });

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={warmupId} className="text-label text-xs font-medium">
            {t("warmup")}
          </label>
          <Textarea
            id={warmupId}
            value={structure.warmup}
            maxLength={500}
            rows={2}
            placeholder={t("warmupPlaceholder")}
            onChange={(e) => onChange({ ...structure, warmup: e.target.value })}
          />
        </div>
        <NumberField
          label={t("minutes")}
          value={structure.minutes}
          max={300}
          suffix={t("minutesShort")}
          onChange={(minutes) => onChange({ ...structure, minutes })}
        />
      </div>

      <section className="flex min-w-0 flex-col gap-2" aria-labelledby={`${warmupId}-ex`}>
        <h3 id={`${warmupId}-ex`} className="text-2sm font-semibold">
          {t("exercises")}
        </h3>
        <ol className="flex flex-col gap-2">
          {exercises.map((exercise, i) => {
            const name = t("exerciseName", { n: i + 1 });
            return (
              <li key={i}>
                <ExerciseEditor
                  exercise={exercise}
                  title={name}
                  onChange={(next) => setExercises(replaceItem(exercises, i, next))}
                  actions={
                    <ItemActions
                      name={exercise.name || name}
                      index={i}
                      count={exercises.length}
                      onMove={(by) => setExercises(moveItem(exercises, i, by))}
                      onDuplicate={
                        exercises.length < 30
                          ? () => setExercises(duplicateItem(exercises, i))
                          : undefined
                      }
                      onRemove={() => setExercises(removeItem(exercises, i))}
                    />
                  }
                />
              </li>
            );
          })}
        </ol>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start max-sm:h-11"
          disabled={exercises.length >= 30}
          onClick={() => setExercises([...exercises, newExercise()])}
        >
          <Plus data-icon="inline-start" />
          {t("addExercise")}
        </Button>
      </section>

      <section className="flex min-w-0 flex-col gap-2" aria-labelledby={`${warmupId}-pr`}>
        <h3 id={`${warmupId}-pr`} className="text-2sm font-semibold">
          {t("progression")}
        </h3>
        <ProgressionEditor
          rules={structure.progression}
          onChange={(progression) => onChange({ ...structure, progression })}
        />
      </section>
    </div>
  );
}
