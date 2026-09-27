"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/textarea";
import type { OtherStructure } from "@/modules/workouts/structure";
import { NumberField } from "./number-field";

/** Everything that is not the bike or the gym — a run, a swim, skiing — in words and minutes. */
export function OtherBuilder({
  structure,
  onChange,
}: {
  structure: OtherStructure;
  onChange: (structure: OtherStructure) => void;
}) {
  const t = useTranslations("workouts.other");
  const id = useId();
  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={id} className="text-label text-xs font-medium">
          {t("text")}
        </label>
        <Textarea
          id={id}
          value={structure.text}
          maxLength={2000}
          rows={4}
          placeholder={t("textPlaceholder")}
          onChange={(e) => onChange({ ...structure, text: e.target.value })}
        />
      </div>
      <NumberField
        label={t("minutes")}
        value={structure.minutes}
        max={1440}
        suffix={t("minutesShort")}
        onChange={(minutes) => onChange({ ...structure, minutes })}
      />
    </div>
  );
}
