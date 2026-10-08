"use client";

import { Bike } from "lucide-react";
import { useId } from "react";
import { useTranslations } from "next-intl";
import {
  GEAR_CLASS_AGES,
  GEAR_CLASSES,
  YOUTH_GEARING,
  type GearClass,
} from "@/modules/dcu/gearing";
import { cn } from "@/lib/utils";

/** The bike on each button grows with the class, as the riders do. */
const BIKE_SIZE: Record<GearClass, string> = {
  U11: "size-4 sm:size-5",
  U13: "size-5 sm:size-6",
  U15: "size-6 sm:size-7",
  U17: "size-7 sm:size-8",
  U19: "size-8 sm:size-9",
};

/**
 * The classes as five large buttons: the class, the ages it is for and
 * its limit, the one chosen filled in moss. Underneath they are radio
 * buttons, so the arrow keys move between them and a screen reader says
 * which is chosen.
 */
export function ClassPicker({
  value,
  onChange,
}: {
  value: GearClass;
  onChange: (value: GearClass) => void;
}) {
  const t = useTranslations("calculators.gearing");
  const name = useId();

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-label mb-2 text-xs font-medium">{t("class")}</legend>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {GEAR_CLASSES.map((c) => {
          const ages = GEAR_CLASS_AGES[c];
          const limit = YOUTH_GEARING[c].limitM;
          return (
            <label
              key={c}
              className={cn(
                "border-border bg-card flex min-h-28 cursor-pointer flex-col items-center justify-end gap-1 rounded-xl border px-1 py-2.5 text-center shadow-surface transition-colors duration-[120ms] ease-out sm:px-2 sm:py-3",
                "hover:bg-secondary has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground",
                "has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
              )}
            >
              <input
                type="radio"
                name={name}
                value={c}
                checked={value === c}
                onChange={() => onChange(c)}
                className="sr-only"
              />
              <span aria-hidden className="mb-auto flex h-8 items-end sm:h-9">
                <Bike className={BIKE_SIZE[c]} strokeWidth={1.75} />
              </span>
              <span className="text-xl leading-none font-semibold sm:text-2xl">{c}</span>
              <span className="text-2xs leading-tight opacity-85 sm:text-xs">
                {ages.to === null
                  ? t("picker.agesFrom", { from: ages.from })
                  : t("picker.ages", { from: ages.from, to: ages.to })}
              </span>
              <span className="text-2xs leading-tight font-medium tabular-nums sm:text-xs">
                {limit === null ? t("picker.free") : t("picker.limit", { limit })}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
