"use client";

import { useTranslations } from "next-intl";
import { NumberField } from "@/components/workouts/number-field";
import type { Position, RaceKind, Sex } from "@/modules/calc/energy";
import type { Method, RaceInput } from "@/modules/calc/race-fuel";
import { FieldSelect } from "./field-select";

type Set = <K extends keyof RaceInput>(key: K, value: RaceInput[K]) => void;

const card =
  "border-border bg-card grid gap-3 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:grid-cols-2 sm:p-5";

/**
 * What the race costs, for the rider who wants to know: the effort by one
 * of four ways and the weight, which stays in the browser and is needed
 * for every way but watts and for the meals before and after.
 */
export function EnergyInputs({ input, set }: { input: RaceInput; set: Set }) {
  const t = useTranslations("calculators.energy");

  return (
    <section className={card} aria-labelledby="energy-effort">
      <div className="flex flex-col gap-1 sm:col-span-2">
        <h2 id="energy-effort" className="text-lg font-semibold">
          {t("effort.title")}
        </h2>
        <p className="text-meta text-2sm leading-relaxed">{t("effort.intro")}</p>
      </div>
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
          <NumberField
            label={t("age")}
            value={input.age}
            onChange={(v) => set("age", v)}
            min={10}
            max={80}
          />
          <FieldSelect<Sex>
            label={t("sex.label")}
            value={input.sex}
            onChange={(s) => set("sex", s)}
            options={(["female", "male"] as const).map((s) => ({
              value: s,
              label: t(`sex.${s}`),
            }))}
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
      <div className="flex flex-col gap-1 sm:col-span-2">
        <NumberField
          label={t("weight")}
          value={input.weightKg}
          onChange={(v) => set("weightKg", v)}
          onClear={() => set("weightKg", null)}
          min={25}
          max={120}
          suffix={t("kg")}
        />
        <p className="text-meta text-xs">{t("weightHint")}</p>
      </div>
      <NumberField
        label={t("hoursBefore")}
        value={input.hoursBefore}
        onChange={(v) => set("hoursBefore", v)}
        min={1}
        max={4}
      />
    </section>
  );
}
