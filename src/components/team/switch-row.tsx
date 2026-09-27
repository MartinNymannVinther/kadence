"use client";

import { useId } from "react";
import { Switch } from "@/components/ui/switch";

/**
 * A switch with its words: what it is, what it does in plain language,
 * and whether it is on — said in text, never by the colour alone.
 */
export function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
  stateText,
}: {
  label: string;
  hint: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** "Slået til" / "Slået fra". */
  stateText: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {label}
        </label>
        <div id={`${id}-hint`} className="text-meta text-2sm leading-relaxed">
          {hint}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
        <Switch
          id={id}
          checked={checked}
          disabled={disabled}
          aria-describedby={`${id}-hint`}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="text-meta text-xs" aria-hidden>
          {stateText}
        </span>
      </div>
    </div>
  );
}
