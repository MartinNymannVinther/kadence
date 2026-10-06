"use client";

import { Pencil, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import { Button } from "@/components/ui/button";
import { addDaysIso } from "@/core/dates";
import { itemMinutes, itemSport, itemTitle, type PlanItem } from "./types";

/**
 * The plan's seven days: side by side on a desk, one under the other on a
 * phone, each with its sessions and a "+" of its own.
 */
export function PlanDays({
  monday,
  items,
  onAdd,
  onEdit,
  onRemove,
  full = false,
}: {
  monday: string;
  /** The plan holds as many sessions as one press may lay in. */
  full?: boolean;
  items: PlanItem[];
  onAdd: (day: number) => void;
  onEdit: (item: PlanItem) => void;
  onRemove: (key: string) => void;
}) {
  const t = useTranslations("weekPlan.days");
  const duration = useTranslations("training.duration");
  const locale = useLocale();
  return (
    <ol className="grid gap-2 @4xl:grid-cols-7">
      {Array.from({ length: 7 }, (_, day) => {
        const date = addDaysIso(monday, day);
        const label = `${weekdayShort(date, locale)} ${dayMonth(date, locale)}`;
        const mine = items.filter((i) => i.day === day);
        return (
          <li
            key={day}
            className="border-border bg-card flex min-w-0 flex-col gap-2 rounded-xl border p-2.5 shadow-surface"
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
                <li
                  key={item.key}
                  className="bg-secondary/60 flex min-w-0 flex-col gap-0.5 rounded-lg px-2 pt-1.5 pb-0.5"
                >
                  <span className="flex min-w-0 items-start gap-1.5">
                    <SportIcon sport={itemSport(item)} className="mt-0.5 size-3.5" />
                    <span className="text-2sm min-w-0 leading-snug font-medium break-words">
                      {itemTitle(item)}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-1">
                    <span className="text-meta text-xs tabular-nums">
                      {itemMinutes(item) > 0 ? durationText(itemMinutes(item), duration) : null}
                    </span>
                    <span className="flex">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-9 sm:size-7"
                        aria-label={t("edit", { title: itemTitle(item) })}
                        onClick={() => onEdit(item)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-9 sm:size-7"
                        aria-label={t("remove", { title: itemTitle(item) })}
                        onClick={() => onRemove(item.key)}
                      >
                        <X />
                      </Button>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
