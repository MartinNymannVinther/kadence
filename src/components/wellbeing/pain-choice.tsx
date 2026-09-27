"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";

/**
 * ATK's pain ladder (Team Danmark's age-related training concept),
 * folded onto four plain steps a rider can answer on the way out of the
 * door: none, a little soreness after training, pain when starting and the
 * next day, pain during training or in everyday life.
 */
export function PainChoice({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const t = useTranslations("checkin.pain");
  const name = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1 text-sm font-medium">{t("label")}</legend>
      <p className="text-meta -mt-0.5 mb-1 text-xs">{t("hint")}</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {([0, 1, 2, 3] as const).map((step) => (
          <label
            key={step}
            className="border-border bg-card has-checked:border-primary has-checked:bg-accent has-focus-visible:outline-ring flex min-h-11 cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 has-focus-visible:outline-2"
          >
            <input
              type="radio"
              name={name}
              value={step}
              checked={value === step}
              onChange={() => onChange(step)}
              className="sr-only"
            />
            <span className="bg-secondary mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
              {step}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-2sm font-medium">{t(`${step}.title`)}</span>
              <span className="text-meta text-xs leading-snug">{t(`${step}.body`)}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
