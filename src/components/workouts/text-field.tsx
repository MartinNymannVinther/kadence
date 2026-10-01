"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/** A small labelled text input for the builder, the size of its number fields. */
export function TextField({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  className,
  hideLabel = false,
  required = false,
  list,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  className?: string;
  hideLabel?: boolean;
  required?: boolean;
  /** A <datalist> of suggestions, by id. */
  list?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className={cn("text-label text-xs font-medium", hideLabel && "sr-only")}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        list={list}
        autoComplete={list ? "off" : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/18 placeholder:text-label h-11 w-full min-w-0 rounded-md border px-2.5 text-base outline-none focus-visible:ring-3 sm:h-9 sm:text-sm"
      />
    </div>
  );
}
