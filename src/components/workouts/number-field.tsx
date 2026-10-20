"use client";

import { useId, type ReactNode } from "react";
import { NumberInput } from "@/components/ui/number-input";
import { cn } from "@/lib/utils";

/**
 * A small labelled number input for the builder. It keeps what is typed
 * while it is typed and hands a whole number on (an empty field is the
 * floor), so a coach can clear a field and write a new number without the
 * field fighting back (NumberInput). An optional number — a cadence — is
 * cleared through `onClear`.
 *
 * A unit sits inside the field, at its right; the keyboard's arrows step.
 * `labelAddon` sits beside the label — an explanation's button.
 */
export function NumberField({
  label,
  value,
  onChange,
  onClear,
  min = 0,
  max,
  suffix,
  className,
  hideLabel = false,
  labelAddon,
}: {
  label: string;
  /** Null shows an empty field. */
  value: number | null;
  onChange: (value: number) => void;
  /** Called instead of `onChange` when the field is emptied; without it, empty is the floor. */
  onClear?: () => void;
  min?: number;
  max?: number;
  suffix?: string;
  className?: string;
  hideLabel?: boolean;
  labelAddon?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      {labelAddon && !hideLabel ? (
        <div className="flex min-h-5 items-center gap-1">
          <label htmlFor={id} className="text-label text-xs font-medium">
            {label}
          </label>
          {labelAddon}
        </div>
      ) : (
        <label
          htmlFor={id}
          className={cn("text-label text-xs font-medium", hideLabel && "sr-only")}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <NumberInput
          id={id}
          min={min}
          max={max}
          value={value}
          onChange={onChange}
          onClear={onClear}
          className={cn("h-11 px-2.5 py-0 tabular-nums sm:h-9 sm:text-sm", suffix && "pr-16")}
        />
        {suffix && (
          <span className="text-meta pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
