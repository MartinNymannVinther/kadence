"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { BUILTIN_EXERCISES } from "@/modules/exercises/builtin";
import { EXERCISE_GROUPS, type ExerciseGroup, type ExerciseView } from "@/modules/exercises/types";
import { builtinExerciseView } from "@/modules/exercises/view";

/**
 * The built-in library, filtered by group, "uden udstyr" and a search of
 * the name, for "sammensæt dit eget" (docs/plan-ovelser-og-programmer.md).
 * Adding an exercise is the composer's to do, by its bare id.
 */
export function ComposerLibrary({
  onAdd,
  disabled,
}: {
  onAdd: (id: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations("exercises");
  const tc = useTranslations("exercises.compose");
  const groupId = useId();
  const searchId = useId();
  const [group, setGroup] = useState<ExerciseGroup | "all">("all");
  const [noEquipment, setNoEquipment] = useState(false);
  const [query, setQuery] = useState("");

  const library = useMemo(
    () =>
      BUILTIN_EXERCISES.map((exercise) => builtinExerciseView(exercise.id, t)).filter(
        (view): view is ExerciseView => view !== null,
      ),
    [t],
  );

  const needle = query.trim().toLowerCase();
  const filtered = library.filter((exercise) => {
    if (group !== "all" && exercise.group !== group) return false;
    if (noEquipment && exercise.equipment.length > 0) return false;
    if (needle && !exercise.name.toLowerCase().includes(needle)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={groupId}>{tc("group")}</Label>
          <NativeSelect
            id={groupId}
            variant="sm"
            value={group}
            onChange={(e) => setGroup(e.target.value as ExerciseGroup | "all")}
            className="w-auto min-w-40"
          >
            <option value="all">{tc("allGroups")}</option>
            {EXERCISE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {t(`groups.${g}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Label className="min-h-10 pb-0.5 sm:min-h-9">
          <Switch checked={noEquipment} onChange={(e) => setNoEquipment(e.target.checked)} />
          {tc("noEquipment")}
        </Label>
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <Label htmlFor={searchId}>{tc("search")}</Label>
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tc("searchPlaceholder")}
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-meta text-2sm">{tc("libraryEmpty")}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {filtered.map((exercise) => (
            <li
              key={exercise.ref}
              className="border-border bg-card flex items-center justify-between gap-2 rounded-lg border p-2.5"
            >
              <span className="flex flex-col">
                <span className="text-reading text-sm font-medium">{exercise.name}</span>
                <span className="text-meta text-2sm">{t(`groups.${exercise.group}`)}</span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={disabled}
                aria-label={tc("add", { name: exercise.name })}
                onClick={() => onAdd(exercise.ref.slice("builtin:".length))}
              >
                <Plus aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
