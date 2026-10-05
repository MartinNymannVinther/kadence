"use client";

import { CircleAlert, CircleCheck, Droplet, Plus, TriangleAlert, X, Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import type { CarbState, FluidState, LaneCheck } from "@/modules/calc/fuel-check";
import type { FuelItemId } from "@/modules/calc/fuel-items";
import { cn } from "@/lib/utils";
import { ITEM_COLOUR, ItemIcon } from "./energy-item-icon";
import type { DragFrom } from "./use-fuel-drag";

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
 * One hour of the race as a place to drop things: its name and minutes,
 * the things in it as small coloured chips — pressed to take one out,
 * dragged to move it — and under them the hour's carbohydrate and fluid
 * with a word and an icon for how the race stands at the end of it.
 */
export function EnergyLane({
  check,
  items,
  selected,
  over,
  quiet,
  onPlace,
  onRemove,
  start,
  wasDrag,
}: {
  check: LaneCheck;
  items: readonly FuelItemId[];
  selected: FuelItemId | null;
  over: boolean;
  /** Nothing in the plan yet: no verdicts, only the hour. */
  quiet: boolean;
  onPlace: () => void;
  onRemove: (index: number) => void;
  start: (item: FuelItemId, from: DragFrom) => (event: React.PointerEvent<HTMLElement>) => void;
  wasDrag: () => boolean;
}) {
  const t = useTranslations("calculators.energy.builder.lane");
  const names = useTranslations("calculators.energy.builder.items");
  const locale = useLocale();
  const { lane } = check;
  const hour = lane.index + 1;
  const name = (id: FuelItemId) => names(`${id}.name` as "water.name");

  return (
    <div
      data-fuel-drop={lane.index}
      className={cn(
        "border-border bg-card flex min-w-0 flex-col gap-2 rounded-lg border-2 border-dashed p-1.5 transition-colors duration-[120ms] sm:p-2",
        over && "border-primary bg-success-tint border-solid",
        selected && !over && "border-primary/60",
      )}
    >
      <div className="flex flex-col">
        <span className="text-2sm font-semibold">{t("title", { hour })}</span>
        <span className="text-meta text-2xs tabular-nums">
          {t("span", { from: lane.fromMin, to: lane.toMin })}
        </span>
      </div>

      <ul className="flex min-h-12 flex-wrap content-start gap-1" aria-label={t("title", { hour })}>
        {items.length === 0 && !selected && (
          <li className="text-meta text-2xs leading-tight">{t("empty")}</li>
        )}
        {items.map((id, index) => (
          <li key={`${id}-${index}`}>
            <button
              type="button"
              aria-label={t("remove", { item: name(id), hour })}
              title={t("remove", { item: name(id), hour })}
              onPointerDown={start(id, { lane: lane.index, index })}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => {
                if (!wasDrag()) onRemove(index);
              }}
              style={{ "--tint": ITEM_COLOUR[id] } as React.CSSProperties}
              className={cn(
                "group relative flex size-9 cursor-grab touch-manipulation items-center justify-center rounded-md border select-none [-webkit-touch-callout:none] active:cursor-grabbing",
                "border-[color-mix(in_oklab,var(--tint)_50%,var(--border))] bg-[color-mix(in_oklab,var(--tint)_16%,var(--card))]",
                "focus-visible:outline-ring outline-none focus-visible:outline-2 focus-visible:outline-offset-1",
              )}
            >
              <ItemIcon id={id} className="size-7" />
              <span
                aria-hidden
                className="bg-foreground text-background absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full opacity-70 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <X className="size-2.5" strokeWidth={3} />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <button
          type="button"
          onClick={onPlace}
          aria-label={t("place", { item: name(selected), hour })}
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring flex min-h-9 items-center justify-center gap-1 rounded-md px-1 text-2xs font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-xs"
        >
          <Plus aria-hidden className="size-3.5" />
          {t("placeShort")}
        </button>
      )}

      <div className="border-hairline mt-auto flex flex-col gap-1.5 border-t pt-1.5">
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
    </div>
  );
}
