"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  EQUIPMENT,
  EXERCISE_GROUPS,
  type Equipment,
  type ExerciseGroup,
} from "@/modules/exercises/types";

/** The words of an exercise as the form holds them. */
export type ExerciseWords = {
  name: string;
  group: ExerciseGroup;
  equipment: Equipment[];
  how: string;
  why: string;
};

/**
 * The exercise in words: its name and group, what it needs, how to do it
 * and why — with the contract's limits on each field
 * (`teamExerciseInputSchema`), so the browser stops what would not save.
 */
export function ExerciseFields({
  value,
  onChange,
}: {
  value: ExerciseWords;
  onChange: (value: ExerciseWords) => void;
}) {
  const t = useTranslations("exercises");
  const ids = { name: useId(), group: useId(), equipment: useId(), how: useId(), why: useId() };
  const set = <K extends keyof ExerciseWords>(key: K, v: ExerciseWords[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={ids.name} className="text-label text-xs font-medium">
            {t("editor.name")}
          </label>
          <Input
            id={ids.name}
            required
            maxLength={60}
            value={value.name}
            placeholder={t("editor.namePlaceholder")}
            className="max-sm:h-11"
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={ids.group} className="text-label text-xs font-medium">
            {t("editor.group")}
          </label>
          <NativeSelect
            id={ids.group}
            className="max-sm:h-11"
            value={value.group}
            onChange={(e) => set("group", e.target.value as ExerciseGroup)}
          >
            {EXERCISE_GROUPS.map((group) => (
              <option key={group} value={group}>
                {t(`groups.${group}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div role="group" aria-labelledby={ids.equipment} className="flex min-w-0 flex-col gap-1.5">
        <span id={ids.equipment} className="text-label text-xs font-medium">
          {t("editor.equipment")}
        </span>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {EQUIPMENT.map((item) => (
            <label
              key={item}
              className="border-border has-checked:border-primary has-checked:bg-accent/60 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-2sm sm:min-h-9"
            >
              <input
                type="checkbox"
                className="accent-primary size-4"
                checked={value.equipment.includes(item)}
                onChange={(e) =>
                  set(
                    "equipment",
                    e.target.checked
                      ? EQUIPMENT.filter((x) => x === item || value.equipment.includes(x))
                      : value.equipment.filter((x) => x !== item),
                  )
                }
              />
              <span className="min-w-0">{t(`equipment.${item}`)}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={ids.how} className="text-label text-xs font-medium">
          {t("editor.how")}
        </label>
        <Textarea
          id={ids.how}
          required
          maxLength={500}
          rows={3}
          value={value.how}
          placeholder={t("editor.howPlaceholder")}
          onChange={(e) => set("how", e.target.value)}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={ids.why} className="text-label text-xs font-medium">
          {t("editor.why")}
        </label>
        <Textarea
          id={ids.why}
          maxLength={300}
          rows={2}
          value={value.why}
          placeholder={t("editor.whyPlaceholder")}
          onChange={(e) => set("why", e.target.value)}
        />
      </div>
    </div>
  );
}
