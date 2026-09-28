"use client";

import { useTranslations } from "next-intl";
import { PERIODS, type Period } from "@/modules/load";
import { cn } from "@/lib/utils";

/** The last month, half year, year, or ever: the same four everywhere records are read. */
export function PeriodSelect({
  value,
  onChange,
  label,
}: {
  value: Period;
  onChange: (period: Period) => void;
  label: string;
}) {
  const t = useTranslations("records.period");
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {PERIODS.map((period) => (
        <button
          key={period}
          type="button"
          role="radio"
          aria-checked={value === period}
          onClick={() => onChange(period)}
          className={cn(
            "focus-ring border-border min-h-11 rounded-md border px-3 text-2sm sm:min-h-9",
            value === period
              ? "border-primary bg-accent font-medium"
              : "bg-card hover:bg-accent/50",
          )}
        >
          {t(period)}
        </button>
      ))}
    </div>
  );
}
