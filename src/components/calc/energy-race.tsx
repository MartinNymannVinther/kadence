"use client";

import { useTranslations } from "next-intl";
import { SegmentedChoice } from "@/components/ui/segmented";
import { MAX_MINUTES, MIN_MINUTES } from "@/modules/calc/fuel-check";
import { GearSlider } from "./gear-slider";

const span = (from: number, to: number, step: number) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

/** Half an hour to six hours in quarters, and the temperatures a Danish season can bring. */
const MINUTES = span(MIN_MINUTES, MAX_MINUTES, 15);
const CELSIUS = span(-5, 40, 1);

/**
 * The race the plan is for: how long it lasts and how warm it is, on
 * sliders with a step button either side, and whether the rider has
 * practised eating much carbohydrate in training, which moves the
 * stomach's limit from 60 to 90 g an hour.
 */
export function EnergyRace({
  minutes,
  celsius,
  gutTrained,
  onMinutes,
  onCelsius,
  onGutTrained,
}: {
  minutes: number;
  celsius: number;
  gutTrained: boolean;
  onMinutes: (minutes: number) => void;
  onCelsius: (celsius: number) => void;
  onGutTrained: (trained: boolean) => void;
}) {
  const t = useTranslations("calculators.energy");
  const duration = (m: number) => {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    if (h === 0) return t("race.durationMinutes", { m: rest });
    return rest === 0 ? t("race.durationHours", { h }) : t("race.durationMixed", { h, m: rest });
  };

  return (
    <section
      aria-labelledby="energy-race"
      className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5"
    >
      <h2 id="energy-race" className="text-lg font-semibold">
        {t("race.title")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <GearSlider
          label={t("race.duration")}
          values={MINUTES}
          value={minutes}
          onChange={onMinutes}
          shown={duration}
          spoken={(m) => t("race.durationSpoken", { m })}
          less={t("race.shorter")}
          more={t("race.longer")}
        />
        <GearSlider
          label={t("temperature")}
          values={CELSIUS}
          value={celsius}
          onChange={onCelsius}
          shown={(c) => t("race.celsiusShown", { c })}
          spoken={(c) => t("race.celsiusSpoken", { c })}
          less={t("race.colder")}
          more={t("race.warmer")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-label text-xs font-medium">{t("gut.label")}</span>
        <SegmentedChoice<"no" | "yes">
          label={t("gut.label")}
          value={gutTrained ? "yes" : "no"}
          onChange={(v) => onGutTrained(v === "yes")}
          options={[
            { value: "no", label: t("gut.no") },
            { value: "yes", label: t("gut.yes") },
          ]}
          className="w-fit"
        />
      </div>
    </section>
  );
}
