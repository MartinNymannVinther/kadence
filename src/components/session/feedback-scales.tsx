"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { RPE_NAMED, RPE_VALUES } from "@/components/training/rpe";
import { cn } from "@/lib/utils";

/**
 * The two things a rider says after a session: how hard it was on the
 * Borg CR10 scale (session RPE, the base of Kadence's load, ADR 0015) and
 * how it felt, 1 to 5. Real radio buttons, big enough for a thumb, with
 * the scale's own words beside the numbers.
 */

const tile =
  "border-border bg-card has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground has-focus-visible:outline-ring flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-2sm has-focus-visible:outline-2";

export function RpeScale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number) => void;
}) {
  const t = useTranslations("session.feedback");
  const words = useTranslations("training.rpe");
  const name = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{t("rpe")}</legend>
      <p className="text-meta -mt-1 mb-1 text-xs leading-relaxed">{t("rpeHint")}</p>
      <div className="grid grid-flow-col grid-cols-2 grid-rows-5 gap-1.5">
        {RPE_VALUES.map((n) => (
          <label key={n} className={tile}>
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <span className="bg-secondary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
              {n}
            </span>
            <span className={cn("min-w-0 leading-tight", !RPE_NAMED.has(n) && "text-meta")}>
              {RPE_NAMED.has(n) ? words(String(n) as "1") : "·"}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FeelScale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number) => void;
}) {
  const t = useTranslations("session.feedback");
  const words = useTranslations("training.feel");
  const name = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{t("feel")}</legend>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={cn(tile, "sm:flex-col sm:items-start sm:gap-0.5")}>
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <span className="text-xs font-semibold tabular-nums">{n}</span>
            <span className="leading-tight">{words(String(n) as "1")}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
