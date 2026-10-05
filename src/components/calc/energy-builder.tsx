"use client";

import { Eraser, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Range } from "@/modules/calc/energy";
import type { PlanCheck } from "@/modules/calc/fuel-check";
import type { Day, MealHours } from "@/modules/calc/fuel-day";
import type { FuelItemId } from "@/modules/calc/fuel-items";
import {
  addItem,
  emptyPlan,
  isFull,
  moveItem,
  removeItem,
  type DayPlan,
  type Slot,
} from "@/modules/calc/fuel-plan";
import type { AfterCheck, MealCheck, MealNote } from "@/modules/calc/meal-check";
import { EnergyAfter } from "./energy-after";
import { EnergyBefore } from "./energy-before";
import { EnergyDuring } from "./energy-during";
import { ItemIcon } from "./energy-item-icon";
import { EnergyPantry } from "./energy-pantry";
import { EnergyResults } from "./energy-results";
import type { SlotBinding } from "./energy-slot";
import { useFuelDrag, type DragFrom, type DropAt } from "./use-fuel-drag";

/**
 * Where the rider builds the day: the pantry at the top, then the meals
 * before, the hours on the bike and the meals after, each with its goal
 * and what the plan comes to, then all of it in words. Kadence's own plan
 * is a button away, and the rider's own comes back with another.
 */
export function EnergyBuilder({
  day,
  onDay,
  plan,
  setPlan,
  empty,
  before,
  during,
  after,
  rider,
  kcalPerHour,
  allowedLossL,
  effort,
  suggested,
  onSuggest,
  onMine,
}: {
  day: Day;
  onDay: <K extends keyof Day>(key: K, value: Day[K]) => void;
  plan: DayPlan;
  setPlan: (update: (plan: DayPlan) => DayPlan) => void;
  empty: boolean;
  before: { total: MealCheck; notes: MealNote[] };
  during: PlanCheck;
  after: AfterCheck;
  rider: string;
  kcalPerHour: Range | null;
  allowedLossL: number;
  effort: React.ReactNode;
  /** Kadence's plan is on the board, with the rider's own kept aside. */
  suggested: boolean;
  onSuggest: () => void;
  onMine: () => void;
}) {
  const t = useTranslations("calculators.energy.builder");
  const names = useTranslations("calculators.energy.items");
  const [selected, setSelected] = useState<FuelItemId | null>(null);
  const [said, setSaid] = useState("");
  const name = useCallback((id: FuelItemId) => names(`${id}.name` as "water.name"), [names]);

  const put = useCallback(
    (item: FuelItemId, slot: Slot) => {
      if (isFull(plan, slot)) return setSaid(t("announce.full"));
      setPlan((p) => addItem(p, slot, item));
      setSaid(t("announce.added", { item: name(item) }));
    },
    [plan, setPlan, t, name],
  );

  const onDrop = useCallback(
    (item: FuelItemId, from: DragFrom, at: DropAt) => {
      if (at === null) return;
      if (at === "pantry") {
        if (from === null) return;
        setPlan((p) => removeItem(p, from));
        return setSaid(t("announce.removed", { item: name(item) }));
      }
      if (from === null) return put(item, at);
      if (from.phase === at.phase && from.index === at.index) return;
      if (isFull(plan, at)) return setSaid(t("announce.full"));
      setPlan((p) => moveItem(p, from, at));
      setSaid(t("announce.moved", { item: name(item) }));
    },
    [plan, put, setPlan, t, name],
  );
  const { drag, start, wasDrag } = useFuelDrag(onDrop);

  const bind = (slot: Slot): SlotBinding => ({
    selected,
    over:
      drag !== null &&
      drag.over !== null &&
      drag.over !== "pantry" &&
      drag.over.phase === slot.phase &&
      drag.over.index === slot.index,
    onPlace: () => {
      if (selected) put(selected, slot);
    },
    onRemove: (index) => {
      const item = plan[slot.phase][slot.index]?.[index];
      setPlan((p) => removeItem(p, { ...slot, item: index }));
      if (item) setSaid(t("announce.removed", { item: name(item) }));
    },
    start,
    wasDrag,
  });

  return (
    <section
      aria-labelledby="energy-builder"
      className="border-border bg-card flex flex-col gap-6 rounded-xl border p-3 shadow-[var(--surface-shadow)] sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="energy-builder" className="text-lg font-semibold">
          {t("title")}
        </h2>
        <p className="text-reading leading-relaxed">{t("intro")}</p>
      </div>

      <EnergyPantry
        bottleMl={day.bottleMl}
        onBottleMl={(ml) => onDay("bottleMl", ml)}
        selected={selected}
        onSelect={setSelected}
        start={start}
        wasDrag={wasDrag}
        dragFrom={drag?.from}
        over={drag?.over ?? null}
      />

      <EnergyBefore
        day={day}
        onMealHours={(h: MealHours) => onDay("mealHours", h)}
        items={plan.before}
        check={before.total}
        notes={before.notes}
        rider={rider}
        quiet={empty}
        bind={bind}
      />
      <EnergyDuring
        day={day}
        lanes={plan.during}
        check={during}
        quiet={empty}
        bind={bind}
        kcalPerHour={kcalPerHour}
        allowedLossL={allowedLossL}
        effort={effort}
      />
      <EnergyAfter
        day={day}
        items={plan.after}
        check={after}
        rider={rider}
        quiet={empty}
        bind={bind}
      />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {suggested ? (
            <Button variant="outline" size="sm" onClick={onMine}>
              <RotateCcw aria-hidden />
              {t("actions.mine")}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onSuggest}>
              <Sparkles aria-hidden />
              {t("actions.suggest")}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={empty}
            onClick={() => {
              setPlan(() => emptyPlan());
              setSaid(t("announce.cleared"));
            }}
          >
            <Eraser aria-hidden />
            {t("actions.clear")}
          </Button>
        </div>
        {suggested && <p className="text-meta text-2sm leading-relaxed">{t("suggested")}</p>}
      </div>

      {!empty && (
        <EnergyResults
          before={before.total}
          during={during}
          after={after}
          gutTrained={day.gutTrained}
        />
      )}

      <p aria-live="polite" className="sr-only">
        {said}
      </p>
      {drag &&
        createPortal(
          <div
            aria-hidden
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 drop-shadow-lg"
            style={{ left: drag.x, top: drag.y }}
          >
            <ItemIcon id={drag.item} className="size-12 rotate-6" />
          </div>,
          document.body,
        )}
    </section>
  );
}
