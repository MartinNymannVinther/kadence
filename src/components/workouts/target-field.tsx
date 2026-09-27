"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { NativeSelect } from "@/components/ui/native-select";
import { RPE_VALUES, rpeText } from "@/components/training/rpe";
import { ZONES, type Target } from "@/modules/workouts/structure";
import { targetOfKind } from "./defaults";
import { NumberField } from "./number-field";

const KINDS = ["zone", "ftp_pct", "hr_pct", "rpe", "open"] as const;

/**
 * How hard a step is meant to be: a zone, a share of threshold power or
 * of threshold pulse, a feel on the RPE scale, or free. Watts and beats
 * are worked out per rider where the session is shown, so one session
 * fits the whole team.
 */
export function TargetField({
  target,
  onChange,
}: {
  target: Target;
  onChange: (target: Target) => void;
}) {
  const t = useTranslations("workouts.target");
  const zones = useTranslations("training.zone");
  const rpe = useTranslations("training.rpe");
  const kindId = useId();
  const valueId = useId();

  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={kindId} className="text-label text-xs font-medium">
          {t("kind")}
        </label>
        <NativeSelect
          id={kindId}
          value={target.kind}
          className="max-sm:h-11 sm:h-9"
          onChange={(e) => onChange(targetOfKind(e.target.value as Target["kind"]))}
        >
          {KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`kinds.${kind}`)}
            </option>
          ))}
        </NativeSelect>
      </div>

      {target.kind === "zone" && (
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={valueId} className="text-label text-xs font-medium">
            {t("zone")}
          </label>
          <NativeSelect
            id={valueId}
            value={target.zone}
            className="max-sm:h-11 sm:h-9"
            onChange={(e) => onChange({ kind: "zone", zone: Number(e.target.value) })}
          >
            {ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {t("zoneOption", { zone, name: zones(String(zone)) })}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}

      {(target.kind === "ftp_pct" || target.kind === "hr_pct") && (
        <fieldset className="grid min-w-0 grid-cols-2 gap-2">
          <legend className="sr-only">{t(`kinds.${target.kind}`)}</legend>
          <NumberField
            label={t("low")}
            value={target.low}
            max={target.kind === "ftp_pct" ? 300 : 130}
            suffix="%"
            onChange={(low) => onChange({ ...target, low, high: Math.max(low, target.high) })}
          />
          <NumberField
            label={t("high")}
            value={target.high}
            max={target.kind === "ftp_pct" ? 300 : 130}
            suffix="%"
            onChange={(high) => onChange({ ...target, high, low: Math.min(high, target.low) })}
          />
        </fieldset>
      )}

      {target.kind === "rpe" && (
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={valueId} className="text-label text-xs font-medium">
            {t("rpe")}
          </label>
          <NativeSelect
            id={valueId}
            value={target.value}
            className="max-sm:h-11 sm:h-9"
            onChange={(e) => onChange({ kind: "rpe", value: Number(e.target.value) })}
          >
            {RPE_VALUES.map((value) => (
              <option key={value} value={value}>
                {rpeText(value, (key) => rpe(key as "1"))}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}

      {target.kind === "open" && (
        <p className="text-meta self-end pb-2 text-xs leading-relaxed">{t("openHint")}</p>
      )}
    </div>
  );
}
