"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { NumberField } from "@/components/workouts/number-field";
import { NativeSelect } from "@/components/ui/native-select";
import { SegmentedChoice } from "@/components/ui/segmented";
import { LOADS, type Dose, type Load } from "@/modules/exercises/types";

/**
 * How much of an exercise: a time or a number of repetitions, per side or
 * not, in sets, and how heavy in a word or not at all — the contract's
 * dose (`doseSchema`), with its limits on the fields so the browser says
 * when a number is out of range.
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
  const tDose = useTranslations("exercises.dose");
  const loadId = useId();
  const perSide = value.perSide ?? false;
  const sets = value.sets ?? 1;
  const load = value.load ? { load: value.load } : {};

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
              ? { kind, seconds: 30, perSide, sets, ...load }
              : { kind, reps: 10, perSide, sets, ...load },
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
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={loadId} className="text-label text-xs font-medium">
          {t("load")}
        </label>
        <NativeSelect
          id={loadId}
          variant="sm"
          className="w-44 max-sm:h-11"
          value={value.load ?? ""}
          onChange={(e) => {
            const { load: _old, ...rest } = value;
            const chosen = e.target.value as Load | "";
            onChange(chosen ? { ...rest, load: chosen } : rest);
          }}
        >
          <option value="">{t("loadNone")}</option>
          {LOADS.map((l) => (
            <option key={l} value={l}>
              {tDose(`loads.${l}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
    </fieldset>
  );
}
