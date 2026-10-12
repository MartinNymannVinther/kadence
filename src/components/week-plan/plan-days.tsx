"use client";

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { Button } from "@/components/ui/button";
import { addDaysIso } from "@/core/dates";
import { cn } from "@/lib/utils";
import { byStartTime } from "@/modules/training/time-place";
import { PlanCard } from "./plan-card";
import { itemTitle, type PlanItem } from "./types";
import { usePlanDrag } from "./use-plan-drag";

/**
 * The plan's seven days: side by side on a desk, one under the other on a
 * phone, each with its sessions and a "+" of its own. A session moves to
 * another day by dragging it there, or by "Flyt til" on its card.
 */
export function PlanDays({
  monday,
  items,
  onAdd,
  onEdit,
  onMove,
  onRemove,
  full = false,
}: {
  monday: string;
  /** The plan holds as many sessions as one press may lay in. */
  full?: boolean;
  items: PlanItem[];
  onAdd: (day: number) => void;
  onEdit: (item: PlanItem) => void;
  onMove: (key: string, day: number) => void;
  onRemove: (key: string) => void;
}) {
  const t = useTranslations("weekPlan.days");
  const locale = useLocale();
  const drag = usePlanDrag(onMove);
  const dayLabel = (day: number) => {
    const date = addDaysIso(monday, day);
    return `${weekdayShort(date, locale)} ${dayMonth(date, locale)}`;
  };
  return (
    <ol className="grid gap-2 @4xl:grid-cols-7">
      {Array.from({ length: 7 }, (_, day) => {
        const label = dayLabel(day);
        const mine = byStartTime(
          items.filter((i) => i.day === day).map((i) => ({ ...i, startTime: i.startTime ?? null })),
        );
        return (
          <li
            key={day}
            {...drag.target(day)}
            className={cn(
              "border-border bg-card flex min-w-0 flex-col gap-2 rounded-xl border p-2.5 shadow-surface motion-safe:transition-colors motion-safe:duration-[120ms]",
              drag.isOver(day) && "outline-primary/70 outline-2 -outline-offset-2 outline-dashed",
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-2sm font-semibold first-letter:uppercase">{label}</h3>
              {!full && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-11 sm:size-7"
                  aria-label={t("add", { day: label })}
                  onClick={() => onAdd(day)}
                >
                  <Plus />
                </Button>
              )}
            </div>
            {mine.length === 0 && <p className="text-meta text-xs">{t("rest")}</p>}
            <ul className="flex flex-col gap-1.5">
              {mine.map((item) => (
                <PlanCard
                  key={item.key}
                  item={item}
                  dayLabel={dayLabel}
                  dragging={drag.draggingKey === item.key}
                  dragProps={drag.source({ key: item.key, day, title: itemTitle(item) })}
                  onEdit={() => onEdit(item)}
                  onMove={(to) => onMove(item.key, to)}
                  onRemove={() => onRemove(item.key)}
                />
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
