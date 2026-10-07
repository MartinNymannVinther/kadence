"use client";

import { useId } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SegmentedChoice } from "@/components/ui/segmented";
import type { ExerciseFilter } from "@/modules/exercises/filter";
import { EQUIPMENT, EXERCISE_GROUPS, type ExerciseView } from "@/modules/exercises/types";

/**
 * Finding an exercise: part of its name, its group, and what it needs.
 * Only the groups and the equipment the list holds are offered. Shared by
 * the library and the programme builder's picker.
 */
export function ExerciseFilters({
  exercises,
  value,
  onChange,
}: {
  exercises: ReadonlyArray<Pick<ExerciseView, "group" | "equipment">>;
  value: ExerciseFilter;
  onChange: (value: ExerciseFilter) => void;
}) {
  const t = useTranslations("exercises");
  const ids = { search: useId(), equipment: useId() };
  const groups = EXERCISE_GROUPS.filter((g) => exercises.some((e) => e.group === g));
  const equipment = EQUIPMENT.filter((item) => exercises.some((e) => e.equipment.includes(item)));

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-sm">
          <label htmlFor={ids.search} className="sr-only">
            {t("library.search")}
          </label>
          <Search
            aria-hidden
            className="text-meta pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            id={ids.search}
            type="search"
            value={value.query}
            placeholder={t("library.search")}
            className="pl-9 max-sm:h-11"
            onChange={(e) => onChange({ ...value, query: e.target.value })}
          />
        </div>
        {equipment.length > 0 && (
          <div className="flex w-full min-w-0 flex-col gap-1 sm:w-48">
            <label htmlFor={ids.equipment} className="text-label text-xs font-medium">
              {t("library.equipmentFilter")}
            </label>
            <NativeSelect
              id={ids.equipment}
              variant="sm"
              className="max-sm:h-11"
              value={value.equipment}
              onChange={(e) =>
                onChange({ ...value, equipment: e.target.value as ExerciseFilter["equipment"] })
              }
            >
              <option value="all">{t("library.allEquipment")}</option>
              <option value="none">{t("equipment.none")}</option>
              {equipment.map((item) => (
                <option key={item} value={item}>
                  {t(`equipment.${item}`)}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
      </div>
      {groups.length > 1 && (
        <div className="max-w-full overflow-x-auto">
          <SegmentedChoice<ExerciseFilter["group"]>
            label={t("library.groupFilter")}
            value={value.group}
            onChange={(group) => onChange({ ...value, group })}
            className="[&>button]:max-sm:min-h-10"
            options={[
              { value: "all", label: t("library.allGroups") },
              ...groups.map((group) => ({ value: group, label: t(`groups.${group}`) })),
            ]}
          />
        </div>
      )}
    </div>
  );
}
