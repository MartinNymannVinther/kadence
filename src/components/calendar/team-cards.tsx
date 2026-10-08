"use client";

import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SignalBadges } from "@/components/insight/signal-badges";
import type { RiderSignals } from "@/components/insight/signals";
import { VolumeBar } from "@/components/season/volume-bar";
import { COLOUR_STYLE, stateKey } from "@/components/training/compliance-mark";
import { dayLong, weekdayShort } from "@/components/training/day-label";
import { hoursText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Volume } from "@/modules/season/volume";
import { EventChip } from "./event-chip";
import { calendarHref, type CalendarQuery } from "./href";
import { cardDays, weekMinutes, type CardDay } from "./team-days";
import type { CalendarActivityCard, CalendarCard, CalendarEventCard, RiderOption } from "./types";

/**
 * The team's week on a phone (ADR 0062): one card per rider instead of a
 * grid two and a half screens wide. The name opens the rider's week, the
 * flags sit beside it, the seven days are compact chips — the day's
 * letter, the sport and how it went — and the season's bar closes the
 * card. A chip with one session opens its panel; with several, the
 * rider's week.
 */
export function TeamCards({
  riders,
  days,
  today,
  sessions,
  activities,
  events,
  query,
  volumes,
  signals,
  onOpenEvent,
  className,
}: {
  riders: RiderOption[];
  days: string[];
  today: string;
  sessions: CalendarCard[];
  activities: CalendarActivityCard[];
  events: CalendarEventCard[];
  query: CalendarQuery;
  volumes: Record<string, Volume>;
  signals: Record<string, RiderSignals>;
  onOpenEvent: (event: CalendarEventCard, date: string) => () => void;
  className?: string;
}) {
  const t = useTranslations("calendar.team");
  const locale = useLocale();
  const first = days[0] ?? today;
  const last = days.at(-1) ?? today;
  const inWeek = (e: CalendarEventCard) => e.startsOn <= last && e.endsOn >= first;
  const firstDay = (e: CalendarEventCard) => (e.startsOn < first ? first : e.startsOn);
  const teamEvents = events.filter((e) => e.riderId === null && inWeek(e));

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {teamEvents.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {teamEvents.map((e) => (
            <EventChip key={e.id} event={e} onOpen={onOpenEvent(e, firstDay(e))} />
          ))}
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {riders.map((rider) => {
          const volume = volumes[rider.id];
          const own = events.filter((e) => e.riderId === rider.id && inWeek(e));
          const minutes = weekMinutes(rider.id, sessions, activities);
          return (
            <li
              key={rider.id}
              className="border-border bg-card flex flex-col gap-2.5 rounded-xl border p-3.5 shadow-surface"
            >
              <div className="-my-1 flex flex-wrap items-center gap-x-3">
                <Link
                  href={calendarHref({ week: query.week, rider: rider.id })}
                  className="focus-ring hover:text-primary flex min-h-10 max-w-full min-w-0 items-center gap-1 text-sm font-semibold"
                >
                  <span className="truncate">{rider.name}</span>
                  <ChevronRight aria-hidden className="text-meta size-4 shrink-0" />
                </Link>
                {signals[rider.id] && (
                  <SignalBadges name={rider.name} signals={signals[rider.id]!} row />
                )}
              </div>
              <ol className="grid grid-cols-7 gap-1">
                {cardDays(rider.id, days, sessions, today, query).map((day) => (
                  <li key={day.date}>
                    <DayChip day={day} locale={locale} />
                  </li>
                ))}
              </ol>
              {own.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {own.map((e) => (
                    <EventChip key={e.id} event={e} onOpen={onOpenEvent(e, firstDay(e))} />
                  ))}
                </div>
              )}
              {volume ? (
                <VolumeBar compact volume={volume} />
              ) : (
                <p className="text-xs font-medium tabular-nums">
                  {t("hours", {
                    done: hoursText(minutes.done, locale),
                    planned: hoursText(minutes.planned, locale),
                  })}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One day as a chip: its letter, its sports, how it went — in words for a screen reader. */
function DayChip({ day, locale }: { day: CardDay; locale: string }) {
  const t = useTranslations("calendar.team");
  const states = useTranslations("training.state");
  const style = day.colour ? COLOUR_STYLE[day.colour] : null;
  const Icon = style?.icon;
  const said = day.sessions.length
    ? day.sessions
        .map((s) => {
          const state = states(stateKey(s.colour, s.done, day.isToday) as "planned");
          return `${s.title}, ${state}`;
        })
        .join("; ")
    : t("dayEmpty");
  const body = (
    <>
      <span aria-hidden className="text-2xs leading-none font-semibold uppercase">
        {weekdayShort(day.date, locale).charAt(0)}
      </span>
      <span aria-hidden className="flex h-3.5 items-center gap-0.5">
        {day.sessions.slice(0, 2).map((s) => (
          <SportIcon key={s.id} sport={s.sport} className="size-3.5" />
        ))}
      </span>
      <span aria-hidden className="flex h-3 items-center">
        {Icon && <Icon className="size-3" />}
      </span>
      <span className="sr-only">{t("day", { day: dayLong(day.date, locale), what: said })}</span>
    </>
  );
  const className = cn(
    "flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-md py-1",
    style ? style.chip : "bg-muted/50 text-meta",
    day.isToday && "ring-primary ring-2 ring-offset-1 ring-offset-[var(--card)]",
  );
  return day.href ? (
    <Link
      href={day.href}
      scroll={false}
      aria-current={day.isToday ? "date" : undefined}
      className={cn("focus-ring", className)}
    >
      {body}
    </Link>
  ) : (
    <span aria-current={day.isToday ? "date" : undefined} className={className}>
      {body}
    </span>
  );
}
