"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A small labelled number input for the builder. It keeps what is typed
 * while it is typed and hands a whole number on (an empty field is the
 * floor), so a coach can clear a field and write a new number without the
 * field fighting back. An optional number — a cadence — is cleared
 * through `onClear`.
 *
 * With a unit inside the field the browser's spinner is hidden, so the
 * unit never sits on top of its arrows; the keyboard's arrows still step.
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
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value !== null && Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            if (e.target.value === "" && onClear) return onClear();
            const n = e.target.value === "" ? min : Math.round(Number(e.target.value));
            if (Number.isFinite(n)) onChange(max === undefined ? n : Math.min(max, n));
          }}
          className={cn(
            "border-input bg-card focus-visible:border-ring focus-visible:ring-ring/18 h-11 w-full min-w-0 rounded-md border px-2.5 text-base tabular-nums outline-none focus-visible:ring-3 sm:h-9 sm:text-sm",
            suffix &&
              "[appearance:textfield] pr-16 [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none",
          )}
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
