"use client";

import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import type { Range } from "@/modules/calc/energy";
import type { Lane, Lanes, PlanCheck } from "@/modules/calc/fuel-check";
import { ABSORB_FLUID, sweatPerHour, type Day } from "@/modules/calc/fuel-day";
import type { Slot } from "@/modules/calc/fuel-plan";
import { cn } from "@/lib/utils";
import { EnergyBudget } from "./energy-budget";
import { EnergyLane } from "./energy-lane";
import { EnergyPhase } from "./energy-phase";
import type { SlotBinding } from "./energy-slot";

/** An hour's share of the board; a short last hour keeps room to drop in. */
const laneWeight = (lane: Lane) => Math.max(0.5, (lane.toMin - lane.fromMin) / 60);

/**
 * On the bike: one slot for each hour, the goal for an hour, and the
 * comparison of what the body uses with what the stomach can take and
 * what the plan gives. How the energy is estimated sits folded under it.
 */
export function EnergyDuring({
  day,
  lanes,
  check,
  quiet,
  bind,
  kcalPerHour,
  allowedLossL,
  effort,
}: {
  day: Day;
  lanes: Lanes;
  check: PlanCheck;
  quiet: boolean;
  bind: (slot: Slot) => SlotBinding;
  kcalPerHour: Range | null;
  allowedLossL: number;
  /** The fields for the effort, folded away. */
  effort: React.ReactNode;
}) {
  const t = useTranslations("calculators.energy.during");
  const locale = useLocale();
  const { advice, fluidPerHour: fluid } = check;
  const hours = (check.lanes.at(-1)?.lane.toMin ?? 60) / 60;
  const targeted = advice.kind === "single" || advice.kind === "multiple";
  const carbs =
    advice.kind === "water"
      ? t("target.water")
      : advice.kind === "small"
        ? t("target.small")
        : advice.low === advice.high
          ? t("target.carbsOne", { high: advice.high })
          : t("target.carbs", { low: advice.low, high: advice.high });
  const columns = check.lanes.map((c) => `minmax(0,${laneWeight(c.lane)}fr)`).join(" ");

  return (
    <EnergyPhase
      step={2}
      title={t(day.session === "race" ? "titleRace" : "titleTraining")}
      intro={t("target.both", {
        carbs,
        fluid: t("target.fluid", {
          low: num(fluid.low, locale, 1),
          high: num(fluid.high, locale, 1),
        }),
      })}
    >
      <div
        className={cn(
          "grid [grid-template-columns:var(--columns)] gap-1.5 sm:gap-2",
          check.lanes.length > 3 && "max-sm:grid-cols-3",
        )}
        style={{ "--columns": columns } as React.CSSProperties}
      >
        {check.lanes.map((c) => (
          <EnergyLane
            key={c.lane.index}
            check={c}
            items={lanes[c.lane.index] ?? []}
            quiet={quiet}
            binding={bind({ phase: "during", index: c.lane.index })}
          />
        ))}
      </div>
      <EnergyBudget
        kcalPerHour={kcalPerHour}
        gutCap={check.gutCap}
        advice={targeted ? advice : null}
        planCarbs={check.totals.carbs / hours}
        sweat={sweatPerHour(day.celsius)}
        absorb={ABSORB_FLUID}
        fluidGoal={fluid}
        planFluid={check.totals.fluidL / hours}
        allowedLossL={allowedLossL}
      />
      <details className="group border-border rounded-lg border">
        <summary className="text-2sm flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-medium">
          {t("effort")}
          <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-border border-t p-3">{effort}</div>
      </details>
    </EnergyPhase>
  );
}
