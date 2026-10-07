"use client";

import { useTranslations } from "next-intl";
import { NumberField } from "@/components/workouts/number-field";
import { SegmentedChoice } from "@/components/ui/segmented";
import type { Dose } from "@/modules/exercises/types";

/**
 * How much of an exercise: a time or a number of repetitions, per side or
 * not, in sets — the contract's dose (`doseSchema`), with its limits on
 * the fields so the browser says when a number is out of range.
 */
export function DoseFields({
  value,
  onChange,
  legend,
  hideLegend = false,
}: {
  value: Dose;
  onChange: (dose: Dose) => void;
  legend: string;
  hideLegend?: boolean;
}) {
  const t = useTranslations("exercises.editor");
  const perSide = value.perSide ?? false;
  const sets = value.sets ?? 1;

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className={hideLegend ? "sr-only" : "text-sm font-medium"}>{legend}</legend>
      <SegmentedChoice<Dose["kind"]>
        label={t("doseKind")}
        value={value.kind}
        className="self-start [&>button]:max-sm:min-h-10"
        options={[
          { value: "time", label: t("time") },
          { value: "reps", label: t("reps") },
        ]}
        onChange={(kind) => {
          if (kind === value.kind) return;
          onChange(
            kind === "time"
              ? { kind, seconds: 30, perSide, sets }
              : { kind, reps: 10, perSide, sets },
          );
        }}
      />
      <div className="grid min-w-0 grid-cols-2 items-end gap-2 sm:grid-cols-[8rem_6rem_auto]">
        {value.kind === "time" ? (
          <NumberField
            label={t("seconds")}
            value={value.seconds}
            min={5}
            max={600}
            onChange={(seconds) => onChange({ ...value, seconds })}
          />
        ) : (
          <NumberField
            label={t("repsCount")}
            value={value.reps}
            min={1}
            max={100}
            onChange={(reps) => onChange({ ...value, reps })}
          />
        )}
        <NumberField
          label={t("sets")}
          value={sets}
          min={1}
          max={10}
          onChange={(n) => onChange({ ...value, sets: Math.max(1, n) })}
        />
        <label className="col-span-2 flex min-h-11 cursor-pointer items-center gap-2 text-2sm sm:col-span-1 sm:min-h-9">
          <input
            type="checkbox"
            className="accent-primary size-4"
            checked={perSide}
            onChange={(e) => onChange({ ...value, perSide: e.target.checked })}
          />
          {t("perSide")}
        </label>
      </div>
    </fieldset>
  );
}
