"use client";

import { Droplet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import type { Day } from "@/modules/calc/fuel-day";
import type { FuelItemId } from "@/modules/calc/fuel-items";
import type { Slot } from "@/modules/calc/fuel-plan";
import type { AfterCheck, MealCheck } from "@/modules/calc/meal-check";
import { cn } from "@/lib/utils";
import { EnergyMeter } from "./energy-meter";
import { EnergyPhase } from "./energy-phase";
import { EnergyPlate } from "./energy-plate";
import { EnergySlot, type SlotBinding } from "./energy-slot";

function Meters({ check, quiet }: { check: MealCheck; quiet: boolean }) {
  const m = useTranslations("calculators.energy.meter");
  const locale = useLocale();
  const l = (n: number) => num(n, locale, 2);
  const state = (s: MealCheck["carbs"]) => (quiet ? null : s.state);
  const word = (s: MealCheck["carbs"]) => (quiet ? null : m(`state.${s.state}`));
  return (
    <div className="flex flex-col gap-2.5">
      <EnergyMeter
        label={m("carbs")}
        value={check.content.carbs}
        shown={m("grams", { g: check.content.carbs })}
        target={check.carbs.target}
        goal={m("goalGrams", { low: check.carbs.target.low, high: check.carbs.target.high })}
        state={state(check.carbs)}
        stateLabel={word(check.carbs)}
      />
      {check.protein && (
        <EnergyMeter
          label={m("protein")}
          value={check.content.protein}
          shown={m("grams", { g: check.content.protein })}
          target={check.protein.target}
          goal={m("goalGrams", { low: check.protein.target.low, high: check.protein.target.high })}
          state={state(check.protein)}
          stateLabel={word(check.protein)}
        />
      )}
      <EnergyMeter
        label={m("fluid")}
        value={check.content.fluidL}
        shown={m("litres", { l: l(check.content.fluidL) })}
        target={check.fluid.target}
        goal={m("goalLitres", { low: l(check.fluid.target.low), high: l(check.fluid.target.high) })}
        state={state(check.fluid)}
        stateLabel={word(check.fluid)}
      />
    </div>
  );
}

/**
 * After: straight away carbohydrate, protein and something to drink for
 * the rider's class, and the plate for the main meal 1–2 hours later.
 * With another hard session within 8 hours, four hours of carbohydrate
 * instead. What was sweated and not drunk back is said in litres.
 */
export function EnergyAfter({
  day,
  items,
  check,
  rider,
  quiet,
  bind,
}: {
  day: Day;
  items: readonly (readonly FuelItemId[])[];
  check: AfterCheck;
  rider: string;
  quiet: boolean;
  bind: (slot: Slot) => SlotBinding;
}) {
  const t = useTranslations("calculators.energy.after");
  const locale = useLocale();
  const l = (n: number) => num(n, locale, 1);
  const soon = check.slots.length > 1;

  return (
    <EnergyPhase step={3} title={t("title")} intro={t(`intro.${day.next}`, { rider })}>
      <div
        className={cn(
          "grid gap-1.5 sm:gap-2",
          soon ? "grid-cols-2 sm:grid-cols-4" : "sm:grid-cols-2",
        )}
      >
        {check.slots.map((slotCheck, index) => {
          const slot: Slot = { phase: "after", index };
          return (
            <EnergySlot
              key={index}
              slot={slot}
              title={soon ? t("hour", { hour: index + 1 }) : t("now")}
              when={soon ? t("hourWhen", { from: index * 60, to: (index + 1) * 60 }) : t("nowWhen")}
              items={items[index] ?? []}
              {...bind(slot)}
            >
              {soon && <Meters check={slotCheck} quiet={quiet} />}
            </EnergySlot>
          );
        })}
        {!soon && check.slots[0] && <Meters check={check.slots[0]} quiet={quiet} />}
      </div>
      <p className="text-reading flex items-start gap-2 text-2sm leading-relaxed">
        <Droplet aria-hidden className="text-meta mt-0.5 size-4 shrink-0" />
        {check.lossL.high > 0
          ? t("sweat", {
              low: l(check.lossL.low),
              high: l(check.lossL.high),
              rLow: l(check.replaceL.low),
              rHigh: l(check.replaceL.high),
            })
          : t("sweatNone")}
      </p>
      <div className="flex flex-col gap-1.5">
        <span className="text-2sm font-semibold">{t("dinner")}</span>
        <EnergyPlate plate={check.plate} />
      </div>
    </EnergyPhase>
  );
}
