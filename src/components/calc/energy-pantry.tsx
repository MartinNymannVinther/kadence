"use client";

import { Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { SegmentedChoice } from "@/components/ui/segmented";
import {
  FUEL_ITEM_IDS,
  FUEL_ITEMS,
  itemContent,
  type BottleMl,
  type FuelItemId,
} from "@/modules/calc/fuel-items";
import { cn } from "@/lib/utils";
import { ITEM_COLOUR, ItemIcon } from "./energy-item-icon";
import type { DragFrom, DropAt } from "./use-fuel-drag";

/**
 * The pantry: four bottles and four kinds of food as coloured cards,
 * each with what it holds for the bottle size chosen. A card is dragged
 * into an hour, or pressed to choose it and then an hour pressed; pressed
 * again, it is put down. Dragged back here, a thing leaves the plan.
 */
export function EnergyPantry({
  bottleMl,
  onBottleMl,
  selected,
  onSelect,
  start,
  wasDrag,
  dragFrom,
  over,
}: {
  bottleMl: BottleMl;
  onBottleMl: (ml: BottleMl) => void;
  selected: FuelItemId | null;
  onSelect: (item: FuelItemId | null) => void;
  start: (item: FuelItemId, from: DragFrom) => (event: React.PointerEvent<HTMLElement>) => void;
  wasDrag: () => boolean;
  /** Where the thing being dragged came from, while one is. */
  dragFrom: DragFrom | undefined;
  over: DropAt;
}) {
  const t = useTranslations("calculators.energy.builder.pantry");
  const items = useTranslations("calculators.energy.builder.items");
  const putBack = dragFrom !== undefined && dragFrom !== null;

  return (
    <section
      data-fuel-drop="pantry"
      aria-labelledby="energy-pantry"
      className={cn(
        "relative flex flex-col gap-3 rounded-lg transition-colors duration-[120ms]",
        putBack && "outline-primary outline-2 outline-dashed outline-offset-4",
        putBack && over === "pantry" && "bg-secondary",
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 id="energy-pantry" className="text-base font-semibold">
            {t("title")}
          </h3>
          <p className="text-meta text-2sm">{t("hint")}</p>
        </div>
        <SegmentedChoice<"500" | "750">
          label={t("bottles")}
          value={String(bottleMl) as "500" | "750"}
          onChange={(v) => onBottleMl(v === "500" ? 500 : 750)}
          options={(["500", "750"] as const).map((ml) => ({
            value: ml,
            label: t("bottleOption", { ml }),
          }))}
        />
      </div>
      <ul className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {FUEL_ITEM_IDS.map((id) => {
          const content = itemContent(id, bottleMl);
          const chosen = selected === id;
          return (
            <li key={id}>
              <button
                type="button"
                aria-pressed={chosen}
                onPointerDown={start(id, null)}
                onContextMenu={(e) => e.preventDefault()}
                onClick={() => {
                  if (!wasDrag()) onSelect(chosen ? null : id);
                }}
                style={{ "--tint": ITEM_COLOUR[id] } as React.CSSProperties}
                className={cn(
                  "flex h-full w-full cursor-grab touch-manipulation flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center select-none [-webkit-touch-callout:none] active:cursor-grabbing sm:px-2",
                  "border-[color-mix(in_oklab,var(--tint)_45%,var(--border))] bg-[color-mix(in_oklab,var(--tint)_14%,var(--card))]",
                  "hover:bg-[color-mix(in_oklab,var(--tint)_24%,var(--card))] transition-colors duration-[120ms] ease-out",
                  "focus-visible:outline-ring outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
                  chosen && "ring-foreground ring-2 ring-offset-2 ring-offset-[var(--card)]",
                )}
              >
                <ItemIcon id={id} className="size-9 sm:size-10" />
                <span className="w-full text-xs leading-tight font-semibold hyphens-auto [overflow-wrap:anywhere] sm:text-2sm">
                  {items(`${id}.name` as "water.name")}
                </span>
                <span className="text-meta text-2xs leading-tight tabular-nums sm:text-xs">
                  {t("carbs", { g: content.carbs })}
                  {FUEL_ITEMS[id].kind === "bottle" && (
                    <>
                      <br />
                      {t("volume", { ml: bottleMl })}
                    </>
                  )}
                </span>
                <span className="text-meta text-2xs leading-tight max-sm:hidden">
                  {items(`${id}.note` as "water.note")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {selected && (
        <p className="bg-sticky text-sticky-ink rounded-md px-3 py-2 text-2sm leading-relaxed">
          {t("chosen", { item: items(`${selected}.name` as "water.name") })}
        </p>
      )}
      {putBack && (
        <p className="text-meta flex items-center gap-1.5 text-2sm">
          <Undo2 aria-hidden className="size-4" />
          {t("dropBack")}
        </p>
      )}
    </section>
  );
}
