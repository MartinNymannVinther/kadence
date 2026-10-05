"use client";

import { Minus, Plus } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";

/**
 * A labelled slider over a short list of values — tyre widths, teeth —
 * with the value written large beside the label and a step button on
 * either side for the one tooth a finger cannot hit on a phone. A few
 * values are marked under the track; a long run only its ends. The
 * slider reads its value aloud in words (`spoken`), not as a position.
 */
export function GearSlider({
  label,
  values,
  value,
  onChange,
  shown,
  spoken,
  less,
  more,
  disabled = false,
}: {
  label: string;
  values: readonly number[];
  value: number;
  onChange: (value: number) => void;
  /** The value as written beside the label and under the track: "50 T", "25 mm". */
  shown: (value: number) => string;
  /** The value as a screen reader says it: "50 tænder". */
  spoken: (value: number) => string;
  /** The step buttons' names: "Én tand færre". */
  less: string;
  more: string;
  disabled?: boolean;
}) {
  const id = useId();
  const index = Math.max(0, values.indexOf(value));
  const last = values.length - 1;
  const marks = values.length <= 8 ? values : [values[0]!, values[last]!];
  const go = (i: number) => onChange(values[Math.min(last, Math.max(0, i))]!);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-label text-xs font-medium">
          {label}
        </label>
        <output htmlFor={id} className="text-lg font-semibold tabular-nums">
          {shown(value)}
        </output>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={less}
          disabled={disabled || index === 0}
          onClick={() => go(index - 1)}
        >
          <Minus aria-hidden />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col">
          <input
            id={id}
            type="range"
            min={0}
            max={last}
            step={1}
            value={index}
            disabled={disabled}
            aria-valuetext={spoken(value)}
            onChange={(e) => go(Number(e.target.value))}
            className="accent-primary h-9 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
          />
          <div aria-hidden className="text-meta flex justify-between px-1 text-2xs tabular-nums">
            {marks.map((v) => (
              <span key={v} className={v === value ? "text-foreground font-semibold" : undefined}>
                {shown(v)}
              </span>
            ))}
          </div>
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={more}
          disabled={disabled || index === last}
          onClick={() => go(index + 1)}
        >
          <Plus aria-hidden />
        </Button>
      </div>
    </div>
  );
}
