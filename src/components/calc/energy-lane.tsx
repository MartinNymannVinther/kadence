"use client";

import { CircleAlert, CircleCheck, Droplet, TriangleAlert, Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import type { CarbState, FluidState, LaneCheck } from "@/modules/calc/fuel-check";
import type { FuelItemId } from "@/modules/calc/fuel-items";
import { cn } from "@/lib/utils";
import { EnergySlot, type SlotBinding } from "./energy-slot";

type Tone = "ok" | "warn" | "bad" | "quiet";

const TONE: Record<Tone, { className: string; Icon: typeof CircleCheck }> = {
  ok: { className: "text-success", Icon: CircleCheck },
  warn: { className: "text-sticky-ink bg-sticky rounded-sm px-1", Icon: TriangleAlert },
  bad: { className: "text-destructive font-semibold", Icon: CircleAlert },
  quiet: { className: "text-meta", Icon: CircleCheck },
};

const carbTone = (s: CarbState): Tone =>
  s === "ok" ? "ok" : s === "free" ? "quiet" : s === "over" ? "warn" : "bad";
const fluidTone = (s: FluidState): Tone => (s === "ok" ? "ok" : s === "under" ? "bad" : "warn");

function Stat({
  Icon,
  label,
  value,
  state,
  tone,
  quiet,
}: {
  Icon: typeof Zap;
  label: string;
  value: string;
  state: string;
  tone: Tone;
  quiet: boolean;
}) {
  const { className, Icon: StateIcon } = TONE[quiet ? "quiet" : tone];
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-2sm font-semibold tabular-nums">
        <Icon aria-hidden className="text-meta size-3.5 shrink-0" />
        <span className="sr-only">{label}</span>
        {value}
      </span>
      {!quiet && (
        <span className={cn("flex w-fit items-center gap-1 text-2xs leading-tight", className)}>
          <StateIcon aria-hidden className="size-3 shrink-0" />
          {state}
        </span>
      )}
    </div>
  );
}

/**
 * One hour on the bike as a slot: the things in it, and under them the
 * hour's carbohydrate and fluid with a word and an icon for how the
 * session stands at the end of it.
 */
export function EnergyLane({
  check,
  items,
  quiet,
  binding,
}: {
  check: LaneCheck;
  items: readonly FuelItemId[];
  /** Nothing in the plan yet: no verdicts, only the hour. */
  quiet: boolean;
  binding: SlotBinding;
}) {
  const t = useTranslations("calculators.energy.lane");
  const locale = useLocale();
  const { lane } = check;

  return (
    <EnergySlot
      slot={{ phase: "during", index: lane.index }}
      title={t("title", { hour: lane.index + 1 })}
      when={t("span", { from: lane.fromMin, to: lane.toMin })}
      items={items}
      {...binding}
    >
      <div className="flex flex-col gap-1.5">
        <Stat
          Icon={Zap}
          label={t("carbsLabel")}
          value={t("carbs", { g: check.carbs })}
          state={t(`carbState.${check.carbState}` as "carbState.ok")}
          tone={carbTone(check.carbState)}
          quiet={quiet}
        />
        <Stat
          Icon={Droplet}
          label={t("fluidLabel")}
          value={t("fluid", { l: num(check.fluidL, locale, 2) })}
          state={t(`fluidState.${check.fluidState}` as "fluidState.ok")}
          tone={fluidTone(check.fluidState)}
          quiet={quiet}
        />
      </div>
    </EnergySlot>
  );
}
