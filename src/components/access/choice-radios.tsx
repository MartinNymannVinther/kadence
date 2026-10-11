"use client";

import { useId } from "react";

/**
 * A choice of two or three as radio buttons in bordered boxes, the way
 * "Tilføj forælder" asks who the parent is (link-member-form.tsx): every
 * option readable at once, and a target a thumb hits.
 */
export function ChoiceRadios<T extends string>({
  legend,
  value,
  onChange,
  options,
}: {
  legend: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="border-border has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:outline-ring flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-focus-visible:outline-2"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="accent-primary"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
