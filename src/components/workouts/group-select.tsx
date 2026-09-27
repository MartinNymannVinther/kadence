"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { NativeSelect } from "@/components/ui/native-select";
import { EXERCISE_GROUPS, type ExerciseGroup } from "@/modules/workouts/structure";
import { cn } from "@/lib/utils";

/** Which group an exercise or a progression rule belongs to: legs, core, upper body … */
export function GroupSelect({
  value,
  onChange,
  label,
  hideLabel = false,
  className,
}: {
  value: ExerciseGroup;
  onChange: (group: ExerciseGroup) => void;
  label: string;
  hideLabel?: boolean;
  className?: string;
}) {
  const groups = useTranslations("workouts.group");
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className={cn("text-label text-xs font-medium", hideLabel && "sr-only")}>
        {label}
      </label>
      <NativeSelect
        id={id}
        value={value}
        className="max-sm:h-11 sm:h-9"
        onChange={(e) => onChange(e.target.value as ExerciseGroup)}
      >
        {EXERCISE_GROUPS.map((group) => (
          <option key={group} value={group}>
            {groups(group)}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
