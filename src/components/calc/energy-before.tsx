"use client";

import { Info, Minus, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { Button } from "@/components/ui/button";
import type { Day, MealHours } from "@/modules/calc/fuel-day";
import type { FuelItemId } from "@/modules/calc/fuel-items";
import type { Slot } from "@/modules/calc/fuel-plan";
import type { MealCheck, MealNote } from "@/modules/calc/meal-check";
import { EnergyMeter } from "./energy-meter";
import { EnergyPhase } from "./energy-phase";
import { EnergySlot, type SlotBinding } from "./energy-slot";

/**
 * Before the start: the main meal, a few hours before, and a snack about
 * an hour before, counted together against one goal for the rider's class
 * — carbohydrate and something to drink.
 */
export function EnergyBefore({
  day,
  onMealHours,
  items,
  check,
  notes,
  rider,
  quiet,
  bind,
}: {
  day: Day;
  onMealHours: (hours: MealHours) => void;
  items: readonly (readonly FuelItemId[])[];
  check: MealCheck;
  notes: MealNote[];
  /** "en typisk U17-dreng". */
  rider: string;
  quiet: boolean;
  bind: (slot: Slot) => SlotBinding;
}) {
  const t = useTranslations("calculators.energy.before");
  const m = useTranslations("calculators.energy.meter");
  const locale = useLocale();
  const l = (n: number) => num(n, locale, 2);
  const h = day.mealHours;

  return (
    <EnergyPhase
      step={1}
      title={t("title")}
      intro={t("intro", {
        rider,
        low: check.carbs.target.low,
        high: check.carbs.target.high,
        flLow: l(check.fluid.target.low),
        flHigh: l(check.fluid.target.high),
        hours: h,
      })}
    >
      <div className="flex items-center gap-2">
        <span className="text-label text-xs font-medium">{t("mealAt")}</span>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t("earlier")}
          disabled={h === 4}
          onClick={() => onMealHours((h + 1) as MealHours)}
        >
          <Plus aria-hidden />
        </Button>
        <output className="min-w-28 text-center text-2sm font-semibold tabular-nums">
          {t("hoursBefore", { hours: h })}
        </output>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t("later")}
          disabled={h === 2}
          onClick={() => onMealHours((h - 1) as MealHours)}
        >
          <Minus aria-hidden />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
        <EnergySlot
          slot={{ phase: "before", index: 0 }}
          title={t("meal")}
          when={t("hoursBefore", { hours: h })}
          items={items[0] ?? []}
          {...bind({ phase: "before", index: 0 })}
        />
        <EnergySlot
          slot={{ phase: "before", index: 1 }}
          title={t("snack")}
          when={t("snackWhen")}
          items={items[1] ?? []}
          {...bind({ phase: "before", index: 1 })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <EnergyMeter
          label={m("carbs")}
          value={check.content.carbs}
          shown={m("grams", { g: check.content.carbs })}
          target={check.carbs.target}
          goal={m("goalGrams", { low: check.carbs.target.low, high: check.carbs.target.high })}
          state={quiet ? null : check.carbs.state}
          stateLabel={quiet ? null : m(`state.${check.carbs.state}`)}
        />
        <EnergyMeter
          label={m("fluid")}
          value={check.content.fluidL}
          shown={m("litres", { l: l(check.content.fluidL) })}
          target={check.fluid.target}
          goal={m("goalLitres", {
            low: l(check.fluid.target.low),
            high: l(check.fluid.target.high),
          })}
          state={quiet ? null : check.fluid.state}
          stateLabel={quiet ? null : m(`state.${check.fluid.state}`)}
        />
      </div>
      {notes.map((n) => (
        <p
          key={n}
          className="bg-secondary flex items-start gap-2 rounded-md px-3 py-2 text-2sm leading-relaxed"
        >
          <Info aria-hidden className="text-meta mt-0.5 size-4 shrink-0" />
          {t(`notes.${n}`)}
        </p>
      ))}
    </EnergyPhase>
  );
}
