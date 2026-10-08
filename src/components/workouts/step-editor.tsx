"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { NativeSelect } from "@/components/ui/native-select";
import { clockText } from "@/components/training/duration";
import { INTENTS, type Intent, type Step } from "@/modules/workouts/structure";
import { DurationField } from "./duration-field";
import { NumberField } from "./number-field";
import { zoneFill, zoneOfTarget } from "./step-zone";
import { TargetField } from "./target-field";

/**
 * One step of a bike session: what it is for, how long, how hard, and —
 * folded away until wanted — a cadence and a word of its own. The left
 * edge carries the step's zone colour, the same as in the profile.
 */
export function StepEditor({
  step,
  title,
  onChange,
  actions,
}: {
  step: Step;
  title: string;
  onChange: (step: Step) => void;
  actions: React.ReactNode;
}) {
  const t = useTranslations("workouts.step");
  const intents = useTranslations("workouts.intent");
  const intentId = useId();
  const labelId = useId();
  const hasCadence = step.cadenceLow !== undefined || step.cadenceHigh !== undefined;

  return (
    <div
      className="border-border bg-card flex min-w-0 flex-col gap-3 rounded-lg border border-l-4 p-3"
      style={{ borderLeftColor: zoneFill(zoneOfTarget(step.target, step.intent)) }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-2sm font-semibold">
          {title}
          <span className="text-meta ml-2 font-normal tabular-nums">{clockText(step.seconds)}</span>
        </p>
        {actions}
      </div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={intentId} className="text-label text-xs font-medium">
            {t("intent")}
          </label>
          <NativeSelect
            id={intentId}
            value={step.intent}
            className="max-sm:h-11 sm:h-9"
            onChange={(e) => onChange({ ...step, intent: e.target.value as Intent })}
          >
            {INTENTS.map((intent) => (
              <option key={intent} value={intent}>
                {intents(intent)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <DurationField
          seconds={step.seconds}
          onChange={(seconds) => onChange({ ...step, seconds })}
        />
      </div>
      <TargetField target={step.target} onChange={(target) => onChange({ ...step, target })} />
      <details className="group" open={hasCadence || Boolean(step.label)}>
        <summary className="text-meta hover:text-foreground focus-visible:outline-ring flex min-h-11 cursor-pointer items-center rounded-sm text-xs outline-none select-none focus-visible:outline-2 focus-visible:outline-solid sm:min-h-0">
          {t("more")}
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
          <NumberField
            label={t("cadenceLow")}
            value={step.cadenceLow ?? null}
            max={200}
            suffix="rpm"
            onChange={(n) => onChange({ ...step, cadenceLow: n })}
            onClear={() => onChange({ ...step, cadenceLow: undefined })}
          />
          <NumberField
            label={t("cadenceHigh")}
            value={step.cadenceHigh ?? null}
            max={200}
            suffix="rpm"
            onChange={(n) => onChange({ ...step, cadenceHigh: n })}
            onClear={() => onChange({ ...step, cadenceHigh: undefined })}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor={labelId} className="text-label text-xs font-medium">
              {t("label")}
            </label>
            <input
              id={labelId}
              value={step.label ?? ""}
              maxLength={80}
              placeholder={t("labelPlaceholder")}
              onChange={(e) => onChange({ ...step, label: e.target.value || undefined })}
              className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/18 placeholder:text-label h-11 w-full min-w-0 rounded-md border px-2.5 text-base outline-none focus-visible:ring-3 sm:h-9 sm:text-sm"
            />
          </div>
        </div>
        <p className="text-meta mt-1.5 text-xs">{t("cadenceHint")}</p>
      </details>
    </div>
  );
}
