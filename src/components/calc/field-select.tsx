"use client";

import { useId } from "react";
import { NativeSelect } from "@/components/ui/native-select";

/** A labelled select for the calculators, in the number field's small label style. */
export function FieldSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-label text-xs font-medium">
        {label}
      </label>
      <NativeSelect
        id={id}
        variant="sm"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
