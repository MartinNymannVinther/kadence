"use client";

import { BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { renamed, untied } from "@/modules/workouts/exercise-choice";
import type { Exercise } from "@/modules/workouts/structure";
import { GroupSelect } from "./group-select";
import { NumberField } from "./number-field";
import { TextField } from "./text-field";
import type { CatalogueOption } from "./use-catalogue";

/**
 * One exercise: its name and group, sets × reps with a load written the
 * way a coach writes it ("RM", "20 kg", "kropsvægt"), the rest between
 * sets and a note. The progression below may change sets, reps and load
 * by where the rider is in the programme. Typing a name offers the
 * library's exercises and the catalogue's (ADR 0044); choosing one fills
 * its group, sets, reps and load while those are still the new exercise's
 * defaults, and one of the library's ties the exercise to it, so the
 * session shows its figure and how-to. The tie is said below the name,
 * with the way to undo it (src/modules/workouts/exercise-choice.ts).
 */
export function ExerciseEditor({
  exercise,
  title,
  onChange,
  actions,
  catalogue = [],
  listId,
}: {
  exercise: Exercise;
  /** The suggestions, and the id of the <datalist> that offers them. */
  catalogue?: CatalogueOption[];
  listId?: string;
  title: string;
  onChange: (exercise: Exercise) => void;
  actions: React.ReactNode;
}) {
  const t = useTranslations("workouts.exercise");
  const set = <K extends keyof Exercise>(key: K, value: Exercise[K]) =>
    onChange({ ...exercise, [key]: value });
  // The library's name for the exercise this one is tied to, once the
  // library's suggestions have arrived.
  const linked = exercise.ref ? catalogue.find((e) => e.ref === exercise.ref)?.name : undefined;

  return (
    <div className="border-border bg-card flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-2sm font-semibold">{exercise.name || title}</p>
        {actions}
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TextField
          label={t("name")}
          value={exercise.name}
          maxLength={80}
          placeholder={t("namePlaceholder")}
          required
          className="col-span-2 sm:col-span-1"
          list={listId}
          onChange={(name) => onChange(renamed(exercise, name, catalogue))}
        />
        <GroupSelect
          label={t("group")}
          value={exercise.group}
          className="col-span-2 sm:col-span-1"
          onChange={(v) => set("group", v)}
        />
      </div>
      {exercise.ref && (
        <p className="text-meta flex flex-wrap items-center gap-x-2 text-xs">
          <BookOpen aria-hidden className="size-3.5" />
          <span>{linked ? t("linked", { name: linked }) : t("linkedUnnamed")}</span>
          <button
            type="button"
            className="focus-ring text-foreground underline-offset-4 hover:underline"
            onClick={() => onChange(untied(exercise))}
          >
            {t("unlink")}
          </button>
        </p>
      )}
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
        <NumberField
          label={t("sets")}
          value={exercise.sets}
          min={1}
          max={10}
          onChange={(v) => set("sets", Math.max(1, v))}
        />
        <TextField
          label={t("reps")}
          value={exercise.reps}
          maxLength={20}
          placeholder="12"
          onChange={(v) => set("reps", v)}
        />
        <TextField
          label={t("load")}
          value={exercise.load}
          maxLength={40}
          placeholder={t("loadPlaceholder")}
          onChange={(v) => set("load", v)}
        />
        <NumberField
          label={t("rest")}
          value={exercise.restSeconds ?? null}
          max={900}
          suffix={t("secondsShort")}
          onChange={(v) => set("restSeconds", v)}
          onClear={() => set("restSeconds", undefined)}
        />
      </div>
      <TextField
        label={t("note")}
        value={exercise.note}
        maxLength={300}
        placeholder={t("notePlaceholder")}
        onChange={(v) => set("note", v)}
      />
    </div>
  );
}
