"use client";

import { useTranslations } from "next-intl";
import { NumberField } from "./number-field";

/**
 * A step's length as minutes and seconds, the way a coach says it:
 * "5 min", "30 sek", "2 min 30 sek". Up to twelve hours.
 */
export function DurationField({
  seconds,
  onChange,
}: {
  seconds: number;
  onChange: (seconds: number) => void;
}) {
  const t = useTranslations("workouts.step");
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return (
    <fieldset className="grid min-w-0 grid-cols-2 gap-2">
      <legend className="sr-only">{t("duration")}</legend>
      <NumberField
        label={t("minutes")}
        value={minutes}
        max={720}
        suffix={t("minutesShort")}
        onChange={(m) => onChange(Math.max(0, m) * 60 + rest)}
      />
      <NumberField
        label={t("seconds")}
        value={rest}
        max={59}
        suffix={t("secondsShort")}
        onChange={(s) => onChange(minutes * 60 + Math.min(59, Math.max(0, s)))}
      />
    </fieldset>
  );
}
