"use client";

import { Eraser, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { Button } from "@/components/ui/button";
import type { Plan, PlanCheck } from "@/modules/calc/fuel-check";
import type { BottleMl, FuelItemId } from "@/modules/calc/fuel-items";
import { addItem, isFull, moveItem, removeItem } from "@/modules/calc/fuel-plan";
import { cn } from "@/lib/utils";
import { EnergyFeedback } from "./energy-feedback";
import { ItemIcon } from "./energy-item-icon";
import { EnergyLane } from "./energy-lane";
import { EnergyPantry } from "./energy-pantry";
import { EnergyScene, laneWeight } from "./energy-scene";
import { useFuelDrag, type DragFrom, type DropAt } from "./use-fuel-drag";

/**
 * Where the rider builds the plan: the road with the rider on it, the
 * goal for each hour, the pantry, the hours to drop things in, and what
 * the plan comes to in words. Kadence's own plan is a button away, and
 * the rider's own comes back with another.
 */
export function EnergyBuilder({
  check,
  plan,
  setPlan,
  empty,
  celsius,
  gutTrained,
  bottleMl,
  onBottleMl,
  suggested,
  onSuggest,
  onMine,
}: {
  check: PlanCheck;
  plan: Plan;
  setPlan: (update: (plan: Plan) => Plan) => void;
  empty: boolean;
  celsius: number;
  gutTrained: boolean;
  bottleMl: BottleMl;
  onBottleMl: (ml: BottleMl) => void;
  /** Kadence's plan is on the board, with the rider's own kept aside. */
  suggested: boolean;
  onSuggest: () => void;
  onMine: () => void;
}) {
  const t = useTranslations("calculators.energy.builder");
  const names = useTranslations("calculators.energy.builder.items");
  const locale = useLocale();
  const [selected, setSelected] = useState<FuelItemId | null>(null);
  const [said, setSaid] = useState("");
  const name = useCallback((id: FuelItemId) => names(`${id}.name` as "water.name"), [names]);

  const put = useCallback(
    (item: FuelItemId, lane: number) => {
      if (isFull(plan, lane)) return setSaid(t("announce.full", { hour: lane + 1 }));
      setPlan((p) => addItem(p, lane, item));
      setSaid(t("announce.added", { item: name(item), hour: lane + 1 }));
    },
    [plan, setPlan, t, name],
  );

  const onDrop = useCallback(
    (item: FuelItemId, from: DragFrom, at: DropAt) => {
      if (at === null) return;
      if (at === "pantry") {
        if (from === null) return;
        setPlan((p) => removeItem(p, from));
        return setSaid(t("announce.removed", { item: name(item), hour: from.lane + 1 }));
      }
      if (from === null) return put(item, at.lane);
      if (from.lane === at.lane) return;
      if (isFull(plan, at.lane)) return setSaid(t("announce.full", { hour: at.lane + 1 }));
      setPlan((p) => moveItem(p, from, at.lane));
      setSaid(t("announce.moved", { item: name(item), hour: at.lane + 1 }));
    },
    [plan, put, setPlan, t, name],
  );
  const { drag, start, wasDrag } = useFuelDrag(onDrop);

  const { advice, fluidPerHour: fluid } = check;
  const carbs =
    advice.kind === "water"
      ? t("target.water")
      : advice.kind === "small"
        ? t("target.small")
        : advice.low === advice.high
          ? t("target.carbsOne", { high: advice.high })
          : t("target.carbs", { low: advice.low, high: advice.high });
  const lanes = check.lanes;
  const columns = lanes.map((c) => `minmax(0,${laneWeight(c.lane)}fr)`).join(" ");

  return (
    <section
      aria-labelledby="energy-builder"
      className="border-border bg-card flex flex-col gap-5 rounded-xl border p-3 shadow-[var(--surface-shadow)] sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="energy-builder" className="text-lg font-semibold">
          {t("title")}
        </h2>
        <p className="text-reading leading-relaxed">{t("intro")}</p>
      </div>

      <EnergyScene check={check} empty={empty} celsius={celsius} />

      <div className="bg-secondary flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg px-3 py-2">
        <p className="text-reading">
          <span className="font-semibold">{t("target.label")}</span>{" "}
          {t("target.both", {
            carbs,
            fluid: t("target.fluid", {
              low: num(fluid.low, locale, 1),
              high: num(fluid.high, locale, 1),
            }),
          })}
        </p>
        <p className="text-2sm font-semibold tabular-nums">
          {empty ? t("scoreEmpty") : t("score", { on: check.onTarget, total: lanes.length })}
        </p>
      </div>

      <EnergyPantry
        bottleMl={bottleMl}
        onBottleMl={onBottleMl}
        selected={selected}
        onSelect={setSelected}
        start={start}
        wasDrag={wasDrag}
        dragFrom={drag?.from}
        over={drag?.over ?? null}
      />

      <div
        className={cn(
          "grid [grid-template-columns:var(--columns)] gap-1.5 sm:gap-2",
          lanes.length > 3 && "max-sm:grid-cols-3",
        )}
        style={{ "--columns": columns } as React.CSSProperties}
      >
        {lanes.map((c) => (
          <EnergyLane
            key={c.lane.index}
            check={c}
            items={plan[c.lane.index] ?? []}
            selected={selected}
            over={
              drag !== null &&
              drag.over !== null &&
              drag.over !== "pantry" &&
              drag.over.lane === c.lane.index
            }
            quiet={empty}
            onPlace={() => selected && put(selected, c.lane.index)}
            onRemove={(index) => {
              const item = plan[c.lane.index]?.[index];
              setPlan((p) => removeItem(p, { lane: c.lane.index, index }));
              if (item)
                setSaid(t("announce.removed", { item: name(item), hour: c.lane.index + 1 }));
            }}
            start={start}
            wasDrag={wasDrag}
          />
        ))}
      </div>

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
            setPlan((p) => p.map(() => []));
            setSaid(t("announce.cleared"));
          }}
        >
          <Eraser aria-hidden />
          {t("actions.clear")}
        </Button>
      </div>
      {suggested && <p className="text-meta -mt-3 text-2sm leading-relaxed">{t("suggested")}</p>}

      {!empty && <EnergyFeedback check={check} gutTrained={gutTrained} />}

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
