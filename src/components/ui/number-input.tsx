"use client";

import { useState, type ComponentProps } from "react";
import { useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { numberText, stepNumber, typeNumber } from "./number-text";

type NativeProps = Omit<
  ComponentProps<"input">,
  "type" | "value" | "defaultValue" | "onChange" | "min" | "max" | "step" | "inputMode"
>;

/**
 * A number typed into a field. It keeps what is typed while it is typed
 * — the field can be emptied, and "1," can wait for its "5" — and hands
 * the parent the number that text stands for, within `min` and `max`
 * (number-text.ts). Leaving the field shows the number the parent holds:
 * an empty field is its floor, unless `onClear` makes it no number.
 *
 * A text field rather than type="number", so a decimal comma reads the
 * same in every browser; the arrow keys still step, and it is announced
 * as a spin button.
 */
export function NumberInput({
  value,
  onChange,
  onClear,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  decimals = false,
  onBlur,
  onKeyDown,
  ...props
}: NativeProps & {
  /** Null shows an empty field. */
  value: number | null;
  onChange: (value: number) => void;
  /** Called instead of `onChange` when the field is emptied; without it, empty is the floor. */
  onClear?: () => void;
  min?: number;
  max?: number;
  /** What one arrow key adds or takes away. */
  step?: number;
  /** Whether a fractional part may be typed, with a comma or a point. */
  decimals?: boolean;
}) {
  const locale = useLocale();
  const [draft, setDraft] = useState<{ text: string; value: number | null } | null>(null);
  const bounds = { min, max, decimals, empty: onClear ? null : min };

  function hand(next: number | null) {
    if (next === null) {
      if (value !== null) onClear?.();
    } else if (next !== value) onChange(next);
  }

  // The typed text is shown for as long as the parent holds what it stands
  // for; a change from elsewhere (a button, another field) shows the new number.
  const shown = draft !== null && draft.value === value ? draft.text : numberText(value, locale);

  return (
    <Input
      autoComplete="off"
      {...props}
      type="text"
      inputMode={decimals ? "decimal" : "numeric"}
      role="spinbutton"
      aria-valuenow={value ?? undefined}
      aria-valuemin={Number.isFinite(min) ? min : undefined}
      aria-valuemax={Number.isFinite(max) ? max : undefined}
      value={shown}
      onChange={(event) => {
        const typed = typeNumber(event.target.value, bounds, locale);
        if (!typed) return;
        setDraft(typed);
        hand(typed.value);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        const by = event.key === "ArrowUp" ? step : event.key === "ArrowDown" ? -step : 0;
        const modified = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
        if (by === 0 || modified || props.readOnly || props.disabled) return;
        event.preventDefault();
        setDraft(null);
        hand(stepNumber(value, by, bounds));
      }}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
    />
  );
}
