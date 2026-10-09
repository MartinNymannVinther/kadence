"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";

/**
 * ATK's pain ladder (Team Danmark's age-related training concept),
 * folded onto four plain steps a rider can answer on the way out of the
 * door: none, a little soreness after training, pain when starting and the
 * next day, pain during training or in everyday life.
 *
 * Two by two on every screen. On a phone a step's words run under its
 * number and name, the full width of the choice, so the four stay compact
 * without losing a word; from sm they stand beside the number.
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
      <div className="grid grid-cols-2 gap-1.5">
        {([0, 1, 2, 3] as const).map((step) => (
          <label
            key={step}
            className="border-border bg-card has-checked:border-primary has-checked:bg-accent has-focus-visible:outline-ring grid min-h-11 cursor-pointer grid-cols-[auto_minmax(0,1fr)] content-start items-center gap-x-2 gap-y-1 rounded-md border px-2.5 py-2 has-focus-visible:outline-2 sm:items-start sm:gap-x-2.5 sm:gap-y-0 sm:px-3"
          >
            <input
              type="radio"
              name={name}
              value={step}
              checked={value === step}
              onChange={() => onChange(step)}
              className="sr-only"
            />
            <span className="bg-secondary flex size-5 shrink-0 items-center justify-center rounded-full text-2xs font-semibold tabular-nums sm:row-span-2 sm:mt-0.5 sm:size-6 sm:text-xs">
              {step}
            </span>
            <span className="text-2sm leading-tight font-medium sm:leading-normal">
              {t(`${step}.title`)}
            </span>
            <span className="text-meta col-span-2 text-xs leading-snug sm:col-span-1 sm:col-start-2">
              {t(`${step}.body`)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
