"use client";

import { useTranslations } from "next-intl";
import { NumberField } from "@/components/workouts/number-field";
import type { Position, RaceKind, Sex } from "@/modules/calc/energy";
import type { BottleMix } from "@/modules/calc/fuel";
import type { Method, RaceInput } from "@/modules/calc/race-fuel";
import { FieldSelect } from "./field-select";

type Set = <K extends keyof RaceInput>(key: K, value: RaceInput[K]) => void;

const card =
  "border-border bg-card grid gap-3 rounded-xl border p-4 shadow-surface sm:grid-cols-2 sm:p-5";

/** What the rider types: the race, the effort by one of four ways, and the bottles and food. */
export function EnergyInputs({ input, set }: { input: RaceInput; set: Set }) {
  const t = useTranslations("calculators.energy");
  const hours = Math.floor(input.minutes / 60);
  const minutes = input.minutes % 60;

  return (
    <div className="flex flex-col gap-4">
      <section className={card} aria-labelledby="energy-race">
        <h2 id="energy-race" className="text-base font-semibold sm:col-span-2">
          {t("race")}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label={t("hours")}
            value={hours}
            onChange={(h) => set("minutes", h * 60 + minutes)}
            max={12}
          />
          <NumberField
            label={t("minutes")}
            value={minutes}
            onChange={(m) => set("minutes", hours * 60 + m)}
            max={59}
          />
        </div>
        <NumberField
          label={t("temperature")}
          value={input.celsius}
          onChange={(c) => set("celsius", c)}
          min={-10}
          max={45}
          suffix={t("celsius")}
        />
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
        <div className="sm:col-span-2">
          <FieldSelect<"yes" | "no">
            label={t("gut.label")}
            value={input.gutTrained ? "yes" : "no"}
            onChange={(v) => set("gutTrained", v === "yes")}
            options={[
              { value: "no", label: t("gut.no") },
              { value: "yes", label: t("gut.yes") },
            ]}
          />
        </div>
      </section>

      <section className={card} aria-labelledby="energy-food">
        <h2 id="energy-food" className="text-base font-semibold sm:col-span-2">
          {t("food")}
        </h2>
        <FieldSelect<"500" | "750">
          label={t("bottle")}
          value={String(input.bottleMl) as "500" | "750"}
          onChange={(v) => set("bottleMl", v === "500" ? 500 : 750)}
          options={(["500", "750"] as const).map((ml) => ({
            value: ml,
            label: t("bottleOption", { ml }),
          }))}
        />
        <FieldSelect<"0" | "60" | "80">
          label={t("mix.label")}
          value={String(input.mix) as "0" | "60" | "80"}
          onChange={(v) => set("mix", Number(v) as BottleMix)}
          options={[
            { value: "0", label: t("mix.water") },
            { value: "60", label: t("mix.drink") },
            { value: "80", label: t("mix.fuel") },
          ]}
        />
        <div className="flex flex-col gap-1">
          <NumberField
            label={t("piece")}
            value={input.gramsPerPiece}
            onChange={(v) => set("gramsPerPiece", v)}
            min={5}
            max={100}
            suffix="g"
          />
          <p className="text-meta text-xs">{t("pieceHint")}</p>
        </div>
        <NumberField
          label={t("hoursBefore")}
          value={input.hoursBefore}
          onChange={(v) => set("hoursBefore", v)}
          min={1}
          max={4}
        />
      </section>
    </div>
  );
}
