"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FuelItemId } from "@/modules/calc/fuel-items";
import { slotKey, type Slot } from "@/modules/calc/fuel-plan";
import { cn } from "@/lib/utils";
import { ITEM_COLOUR, ItemIcon } from "./energy-item-icon";
import type { DragFrom } from "./use-fuel-drag";

/** What a slot needs from the board to take part in dragging and choosing. */
export type SlotBinding = {
  selected: FuelItemId | null;
  over: boolean;
  onPlace: () => void;
  onRemove: (index: number) => void;
  start: (item: FuelItemId, from: DragFrom) => (event: React.PointerEvent<HTMLElement>) => void;
  wasDrag: () => boolean;
};

/**
 * One place in the plan to drop things: a meal, an hour on the bike, an
 * hour after. Its name and time, the things in it as small coloured
 * chips — pressed to take one out, dragged to move it — a "Læg her"
 * button while a thing is chosen, and under them what the slot comes to.
 */
export function EnergySlot({
  slot,
  title,
  when,
  items,
  selected,
  over,
  onPlace,
  onRemove,
  start,
  wasDrag,
  children,
}: SlotBinding & {
  slot: Slot;
  title: string;
  when: React.ReactNode;
  items: readonly FuelItemId[];
  children?: React.ReactNode;
}) {
  const t = useTranslations("calculators.energy.slot");
  const names = useTranslations("calculators.energy.items");
  const name = (id: FuelItemId) => names(`${id}.name` as "water.name");

  return (
    <div
      data-fuel-drop={slotKey(slot)}
      className={cn(
        "border-border bg-card flex min-w-0 flex-col gap-2 rounded-lg border-2 border-dashed p-1.5 transition-colors duration-[120ms] sm:p-2",
        over && "border-primary bg-success-tint border-solid",
        selected && !over && "border-primary/60",
      )}
    >
      <div className="flex flex-col">
        <span className="text-2sm font-semibold">{title}</span>
        <span className="text-meta text-2xs tabular-nums">{when}</span>
      </div>

      <ul className="flex min-h-10 flex-wrap content-start gap-1" aria-label={title}>
        {items.length === 0 && !selected && (
          <li className="text-meta text-2xs leading-tight">{t("empty")}</li>
        )}
        {items.map((id, index) => (
          <li key={`${id}-${index}`}>
            <button
              type="button"
              aria-label={t("remove", { item: name(id), slot: title })}
              title={t("remove", { item: name(id), slot: title })}
              onPointerDown={start(id, { ...slot, item: index })}
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
          aria-label={t("place", { item: name(selected), slot: title })}
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring flex min-h-9 items-center justify-center gap-1 rounded-md px-1 text-2xs font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-xs"
        >
          <Plus aria-hidden className="size-3.5" />
          {t("placeShort")}
        </button>
      )}

      {children && <div className="border-hairline mt-auto border-t pt-1.5">{children}</div>}
    </div>
  );
}
