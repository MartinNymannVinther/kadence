"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * One question of the check-in, answered with one tap: five real radio
 * buttons, each a thumb wide, with the scale's two ends in words under
 * them. 5 is always the good end.
 */
export function ScaleChoice({
  label,
  low,
  high,
  value,
  onChange,
}: {
  label: string;
  low: string;
  high: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  const name = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className={cn(
              "border-border bg-card has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground has-focus-visible:outline-ring flex min-h-11 cursor-pointer items-center justify-center rounded-md border text-sm font-semibold tabular-nums has-focus-visible:outline-2",
            )}
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <span aria-hidden>{n}</span>
            <span className="sr-only">
              {n === 1 ? `1, ${low}` : n === 5 ? `5, ${high}` : String(n)}
            </span>
          </label>
        ))}
      </div>
      <div className="text-meta flex justify-between gap-2 text-xs" aria-hidden>
        <span>{low}</span>
        <span className="text-right">{high}</span>
      </div>
    </fieldset>
  );
}
