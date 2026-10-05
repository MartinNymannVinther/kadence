"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { NumberField } from "@/components/workouts/number-field";
import type { Position, RaceKind } from "@/modules/calc/energy";
import type { Method, RaceInput, Warning } from "@/modules/calc/race-fuel";
import { FieldSelect } from "./field-select";

type Set = <K extends keyof RaceInput>(key: K, value: RaceInput[K]) => void;

const card = "grid gap-3 sm:grid-cols-2";

/**
 * How hard the session is, by one of four ways, for the estimate of what
 * the body uses. Weight, age and sex come from the class and sex chosen
 * at the top, so none of them is asked for here.
 */
export function EnergyInputs({
  input,
  set,
  warnings,
}: {
  input: RaceInput;
  set: Set;
  /** What makes the estimate less certain: a heart rate formula made on adults, speed in a bunch. */
  warnings: readonly Warning[];
}) {
  const t = useTranslations("calculators.energy.effort");
  const w = useTranslations("calculators.energy.warnings");

  return (
    <div className={card}>
      <p className="text-meta text-2sm leading-relaxed sm:col-span-2">{t("intro")}</p>
      <div className="sm:col-span-2">
        <FieldSelect<Method>
          label={t("method.label")}
          value={input.method}
          onChange={(m) => set("method", m)}
          options={(["watts", "speed", "heartRate", "met"] as const).map((m) => ({
            value: m,
            label: t(`method.${m}`),
          }))}
        />
      </div>
      {input.method === "watts" && (
        <div className="flex flex-col gap-1 sm:col-span-2">
          <NumberField
            label={t("watts")}
            value={input.watts}
            onChange={(w) => set("watts", w)}
            max={600}
            suffix="W"
          />
          <p className="text-meta text-xs">{t("wattsHint")}</p>
        </div>
      )}
      {input.method === "speed" && (
        <>
          <NumberField
            label={t("kmh")}
            value={input.kmh}
            onChange={(v) => set("kmh", v)}
            max={60}
            suffix={t("kmhUnit")}
          />
          <NumberField
            label={t("climb")}
            value={input.climbM}
            onChange={(v) => set("climbM", v)}
            max={5000}
            suffix="m"
          />
          <FieldSelect<Position>
            label={t("position.label")}
            value={input.position}
            onChange={(p) => set("position", p)}
            options={(["hoods", "drops", "timeTrial"] as const).map((p) => ({
              value: p,
              label: t(`position.${p}`),
            }))}
          />
          <NumberField
            label={t("bikeKg")}
            value={input.bikeKg}
            onChange={(v) => set("bikeKg", v)}
            min={5}
            max={15}
            suffix={t("kg")}
          />
        </>
      )}
      {input.method === "heartRate" && (
        <>
          <NumberField
            label={t("bpm")}
            value={input.bpm}
            onChange={(v) => set("bpm", v)}
            max={220}
          />
        </>
      )}
      {input.method === "met" && (
        <FieldSelect<RaceKind>
          label={t("raceKind.label")}
          value={input.raceKind}
          onChange={(k) => set("raceKind", k)}
          options={(["fast", "racing", "solo"] as const).map((k) => ({
            value: k,
            label: t(`raceKind.${k}`),
          }))}
        />
      )}
      {warnings.map((warning) => (
        <p
          key={warning}
          className="bg-sticky text-sticky-ink flex items-start gap-2 rounded-md px-3 py-2 text-2sm leading-relaxed sm:col-span-2"
        >
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          {w(warning as "heartRateAge")}
        </p>
      ))}
    </div>
  );
}
