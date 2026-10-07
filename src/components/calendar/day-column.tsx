"use client";

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { dayLong, dayMonth, weekdayShort } from "@/components/training/day-label";
import { cn } from "@/lib/utils";
import { ActivityChip } from "./activity-chip";
import { EventChip } from "./event-chip";
import type { CalendarActivityCard, CalendarEventCard } from "./types";

/**
 * One day of a rider's week: its name and date, the day's events as
 * chips, then the sessions and whatever was done without a plan. A column
 * on a desktop, a block in a list on a phone; a place to drop a session
 * dragged from another day.
 */
export function DayColumn({
  date,
  today,
  events,
  activities,
  children,
  empty,
  isOver,
  dropProps,
  onAdd,
  onOpenEvent,
}: {
  date: string;
  today: string;
  events: CalendarEventCard[];
  activities: CalendarActivityCard[];
  /** The day's session cards. */
  children: React.ReactNode;
  empty: boolean;
  isOver: boolean;
  dropProps: React.HTMLAttributes<HTMLLIElement>;
  onAdd?: () => void;
  /** The handler that opens an event, for the events this person may change. */
  onOpenEvent?: (event: CalendarEventCard) => (() => void) | undefined;
}) {
  const t = useTranslations("calendar.week");
  const locale = useLocale();
  const isToday = date === today;

  return (
    <li
      {...dropProps}
      aria-current={isToday ? "date" : undefined}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-xl border px-2.5 py-1.5 transition-colors duration-[120ms] @4xl:min-h-52 @4xl:py-2.5",
        isToday ? "border-primary/40 bg-accent/40" : "border-border bg-secondary/40",
        isOver && "outline-primary/70 outline-2 -outline-offset-2 outline-dashed",
      )}
    >
      <div className="flex min-h-8 items-center justify-between gap-1">
        <h3 className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-2sm font-semibold">
          <span className="whitespace-nowrap first-letter:uppercase">
            {weekdayShort(date, locale)}{" "}
            <span className="text-meta font-normal">{dayMonth(date, locale)}</span>
          </span>
          {isToday && (
            <span className="text-primary text-xs font-semibold whitespace-nowrap">
              {t("today")}
            </span>
          )}
          {/* On a phone an empty day is one line, so the week fits on a screen or two. */}
          {empty && events.length === 0 && (
            <span className="text-meta text-xs font-normal whitespace-nowrap @4xl:hidden">
              {t("nothing")}
            </span>
          )}
        </h3>
        {onAdd && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-11 shrink-0 sm:size-7"
            aria-label={t("addOn", { day: dayLong(date, locale) })}
            title={t("addOn", { day: dayLong(date, locale) })}
            onClick={onAdd}
          >
            <Plus />
          </Button>
        )}
      </div>
      {events.length > 0 && (
        <div className="flex flex-col gap-1">
          {events.map((event) => (
            <EventChip key={event.id} event={event} onOpen={onOpenEvent?.(event)} day={date} full />
          ))}
        </div>
      )}
      {!empty && <div className="flex flex-col gap-2">{children}</div>}
      {activities.map((activity) => (
        <ActivityChip key={activity.id} activity={activity} />
      ))}
      {empty && events.length === 0 && (
        <p className="text-meta hidden text-xs @4xl:block">{t("nothing")}</p>
      )}
    </li>
  );
}
