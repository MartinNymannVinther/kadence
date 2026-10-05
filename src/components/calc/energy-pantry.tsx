"use client";

import { ChevronLeft, ChevronRight, Undo2 } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SegmentedChoice } from "@/components/ui/segmented";
import {
  FUEL_ITEMS,
  itemContent,
  MEAL_ITEM_IDS,
  RIDE_ITEM_IDS,
  type BottleMl,
  type FuelItemId,
} from "@/modules/calc/fuel-items";
import { cn } from "@/lib/utils";
import { ITEM_COLOUR, ItemIcon } from "./energy-item-icon";
import type { DragFrom, DropAt } from "./use-fuel-drag";

type Shelf = "meal" | "ride";

/**
 * The pantry: meals for before and after on one shelf, bottles and food
 * for the bike on the other, each a coloured card with what a portion
 * holds. It stays at the top of the screen while the plan scrolls under
 * it, so a thing can be dragged into any slot. A card is dragged, or
 * pressed to choose it and then a slot pressed; pressed again, it is put
 * down. Dragged back here, a thing leaves the plan.
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
  const t = useTranslations("calculators.energy.pantry");
  const items = useTranslations("calculators.energy.items");
  const [shelf, setShelf] = useState<Shelf>("meal");
  const row = useRef<HTMLUListElement>(null);
  const scroll = (by: number) => row.current?.scrollBy({ left: by, behavior: "smooth" });
  const putBack = dragFrom !== undefined && dragFrom !== null;
  const ids: readonly FuelItemId[] = shelf === "meal" ? MEAL_ITEM_IDS : RIDE_ITEM_IDS;

  return (
    <section
      data-fuel-drop="pantry"
      aria-labelledby="energy-pantry"
      className={cn(
        "bg-card border-border sticky top-0 z-20 -mx-3 flex flex-col gap-1.5 border-b px-3 pt-2 pb-2 shadow-[0_6px_12px_-10px_rgba(0,0,0,0.25)] sm:-mx-5 sm:px-5",
        putBack && over === "pantry" && "bg-secondary",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="energy-pantry" className="sr-only">
          {t("title")}
        </h3>
        <SegmentedChoice<Shelf>
          label={t("title")}
          value={shelf}
          onChange={setShelf}
          options={[
            { value: "meal", label: t("meals") },
            { value: "ride", label: t("ride") },
          ]}
        />
        {shelf === "ride" && (
          <SegmentedChoice<"500" | "750">
            label={t("bottles")}
            value={String(bottleMl) as "500" | "750"}
            onChange={(v) => onBottleMl(v === "500" ? 500 : 750)}
            options={(["500", "750"] as const).map((ml) => ({
              value: ml,
              label: t("bottleOption", { ml }),
            }))}
          />
        )}
      </div>
      <div className="relative">
        <ul
          ref={row}
          className="-mx-1 flex snap-x gap-1.5 overflow-x-auto scroll-smooth px-1 pb-1 sm:mx-8"
        >
          {ids.map((id) => {
            const content = itemContent(id, bottleMl);
            const chosen = selected === id;
            return (
              <li key={id} className="shrink-0 snap-start">
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
                    "flex h-full w-[4.75rem] cursor-grab touch-manipulation flex-col items-center gap-0.5 rounded-xl border px-1 py-1.5 text-center select-none [-webkit-touch-callout:none] active:cursor-grabbing",
                    "border-[color-mix(in_oklab,var(--tint)_45%,var(--border))] bg-[color-mix(in_oklab,var(--tint)_14%,var(--card))]",
                    "transition-colors duration-[120ms] ease-out hover:bg-[color-mix(in_oklab,var(--tint)_24%,var(--card))]",
                    "focus-visible:outline-ring outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
                    chosen && "ring-foreground ring-2 ring-offset-2 ring-offset-[var(--card)]",
                  )}
                >
                  <ItemIcon id={id} className="size-8" />
                  <span className="w-full text-2xs leading-tight font-semibold hyphens-auto [overflow-wrap:anywhere]">
                    {items(`${id}.name` as "water.name")}
                  </span>
                  <span className="text-meta text-2xs leading-tight tabular-nums">
                    {FUEL_ITEMS[id].kind === "bottle"
                      ? t("bottleAmount", { ml: bottleMl, g: content.carbs })
                      : t("amount", { g: content.carbs })}
                    {content.protein >= 5 && (
                      <>
                        <br />
                        {t("protein", { g: content.protein })}
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          aria-label={t("back")}
          onClick={() => scroll(-240)}
          className="border-border bg-card hover:bg-secondary absolute top-1/2 left-0 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full border sm:flex"
        >
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          aria-label={t("forward")}
          onClick={() => scroll(240)}
          className="border-border bg-card hover:bg-secondary absolute top-1/2 right-0 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full border sm:flex"
        >
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>
      {putBack ? (
        <p className="text-meta flex items-center gap-1.5 text-2sm">
          <Undo2 aria-hidden className="size-4" />
          {t("dropBack")}
        </p>
      ) : (
        <p className="text-meta text-2xs">
          {selected ? t("chosen", { item: items(`${selected}.name` as "water.name") }) : t("hint")}
        </p>
      )}
    </section>
  );
}
