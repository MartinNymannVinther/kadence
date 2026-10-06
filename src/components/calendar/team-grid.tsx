"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus, CalendarRange, CopyPlus, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { hoursText } from "@/components/training/duration";
import { SignalBadges } from "@/components/insight/signal-badges";
import type { RiderSignals } from "@/components/insight/signals";
import { VolumeBar } from "@/components/season/volume-bar";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { CalendarDialogs, type DialogState } from "./calendar-dialogs";
import { EventChip } from "./event-chip";
import { calendarHref, type CalendarQuery } from "./href";
import { TeamCards } from "./team-cards";
import { TeamChip } from "./team-chip";
import { weekMinutes } from "./team-days";
import type { Volume } from "@/modules/season/volume";
import type { TemplateOption } from "./template-picker";
import type { CalendarActivityCard, CalendarCard, CalendarEventCard, RiderOption } from "./types";
import { useSessionDrag } from "./use-session-drag";
import { useWeekSessions } from "./use-week-sessions";

/**
 * The coach's week for the whole team: a row per rider, a column per day,
 * each session a small chip in its colour — what TrainingPeaks does not
 * show on one screen. The names are held in place when it scrolls
 * sideways, and a chip can be dragged to another day in its own row. Each
 * rider's open flags sit under the name as badges that lead to the
 * attention list below (ADR 0061), and each rider's week on the bike
 * against the season plan, in the four numbers every planning view
 * shares (ADR 0040), is the last column. Below md the grid gives way to
 * one card per rider (team-cards.tsx).
 */
export function TeamGrid({
  riders,
  days,
  today,
  sessions: initial,
  activities,
  events,
  templates,
  query,
  volumes,
  signals,
}: {
  riders: RiderOption[];
  days: string[];
  today: string;
  sessions: CalendarCard[];
  activities: CalendarActivityCard[];
  events: CalendarEventCard[];
  templates: TemplateOption[];
  query: CalendarQuery;
  /** Each rider's four numbers for the week (ADR 0040), by rider id. */
  volumes: Record<string, Volume>;
  /** Each rider's open flags this week, by rider id (ADR 0061); empty in another week. */
  signals: Record<string, RiderSignals>;
}) {
  const t = useTranslations("calendar.team");
  const actions = useTranslations("calendar.actions");
  const labels = useTranslations("calendar.week");
  const copy = useTranslations("calendar.copyWeek");
  const locale = useLocale();
  const { sessions, move, landed, announcement } = useWeekSessions(initial);
  const drag = useSessionDrag(move);
  const [dialog, setDialog] = useState<DialogState>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const firstDay = days.includes(today) ? today : (days[0] ?? today);
  const on = (date: string, e: CalendarEventCard) => e.startsOn <= date && e.endsOn >= date;
  const teamEvents = events.filter((e) => e.riderId === null);
  const openEvent = (event: CalendarEventCard, date: string) => () =>
    setDialog({ kind: "event", date, riderId: event.riderId, event });

  // When the grid is wider than the screen, start it at today, not at Monday.
  useEffect(() => {
    const box = scroller.current;
    if (!box || box.scrollWidth <= box.clientWidth) return;
    const cell = box.querySelector<HTMLElement>('th[aria-current="date"]');
    const names = box.querySelector<HTMLElement>("thead th");
    if (cell) box.scrollLeft = Math.max(0, cell.offsetLeft - (names?.offsetWidth ?? 0) - 8);
  }, [days]);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Link
          href={`/calendar/week-plan?week=${days[0] ?? today}`}
          className={cn(buttonVariants(), "max-sm:h-11")}
        >
          <CalendarRange data-icon="inline-start" />
          {t("plan")}
        </Link>
        <Button
          variant="outline"
          className="max-sm:h-11"
          onClick={() => setDialog({ kind: "session", date: firstDay, riderIds: [] })}
        >
          <Plus data-icon="inline-start" />
          {actions("addSession")}
        </Button>
        <Button
          variant="outline"
          className="max-sm:h-11"
          onClick={() => setDialog({ kind: "event", date: firstDay, riderId: null })}
        >
          <CalendarPlus data-icon="inline-start" />
          {actions("addEvent")}
        </Button>
        <Button
          variant="outline"
          className="max-sm:h-11"
          onClick={() =>
            setDialog({
              kind: "copyWeek",
              monday: days[0] ?? today,
              riderIds: riders.map((r) => r.id),
            })
          }
        >
          <CopyPlus data-icon="inline-start" />
          {copy("open")}
        </Button>
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <TeamCards
        {...{ riders, days, today, sessions, activities, events, query, volumes, signals }}
        onOpenEvent={openEvent}
        className="md:hidden"
      />
      <div
        ref={scroller}
        className="border-border bg-card overflow-x-auto overscroll-x-contain rounded-xl border shadow-[var(--surface-shadow)] max-md:hidden"
      >
        {/* Fixed layout: the columns come from <colgroup>, never from a chip's text.
            The floor is names with their badges (10rem) + 7 × 6.5rem + the week (9rem);
            below it the grid scrolls sideways. */}
        <table className="w-full table-fixed min-w-[64.5rem] border-collapse text-sm">
          <caption className="sr-only">{t("caption")}</caption>
          <colgroup>
            <col className="w-40" />
            {days.map((date) => (
              <col key={date} />
            ))}
            <col className="w-36" />
          </colgroup>
          <thead>
            <tr className="border-border border-b">
              <th
                scope="col"
                className="bg-card text-label sticky left-0 z-10 px-3 py-2 text-left align-top text-xs font-medium shadow-[inset_-1px_0_0_var(--border)]"
              >
                {t("rider")}
              </th>
              {days.map((date) => (
                <th
                  key={date}
                  scope="col"
                  aria-current={date === today ? "date" : undefined}
                  className={cn(
                    "px-1.5 py-2 text-left align-top text-xs",
                    date === today && "bg-accent/50",
                  )}
                >
                  <span
                    className={cn(
                      "block font-semibold first-letter:uppercase",
                      date === today && "text-primary",
                    )}
                  >
                    {weekdayShort(date, locale)}
                  </span>
                  <span className="text-meta block font-normal">
                    {dayMonth(date, locale)}
                    {date === today && (
                      <>
                        {" "}
                        <span className="text-primary font-semibold">{labels("today")}</span>
                      </>
                    )}
                  </span>
                  <span className="mt-1 flex flex-col gap-1">
                    {teamEvents
                      .filter((e) => on(date, e))
                      .map((e) => (
                        <EventChip key={e.id} event={e} onOpen={openEvent(e, date)} />
                      ))}
                  </span>
                </th>
              ))}
              <th
                scope="col"
                className="text-label py-2 pr-3 pl-1 text-left align-top text-xs font-medium whitespace-nowrap"
              >
                {t("week")}
              </th>
            </tr>
          </thead>
          <tbody>
            {riders.map((rider) => {
              const mine = sessions.filter((s) => s.riderId === rider.id);
              const { planned, done } = weekMinutes(rider.id, sessions, activities);
              return (
                <tr key={rider.id} className="border-hairline border-b last:border-b-0">
                  <th
                    scope="row"
                    className="bg-card sticky left-0 z-10 px-3 py-2 text-left align-top font-medium shadow-[inset_-1px_0_0_var(--border)]"
                  >
                    <Link
                      href={calendarHref({ week: query.week, rider: rider.id })}
                      title={rider.name}
                      className="focus-ring hover:text-primary line-clamp-2 text-2sm break-words"
                    >
                      {rider.name}
                    </Link>
                    {signals[rider.id] && (
                      <SignalBadges
                        name={rider.name}
                        signals={signals[rider.id]!}
                        className="mt-1.5"
                      />
                    )}
                  </th>
                  {days.map((date) => (
                    <td
                      key={date}
                      {...drag.target(rider.id, date)}
                      className={cn(
                        "px-1 py-1.5 align-top",
                        date === today && "bg-accent/40",
                        drag.isOver(rider.id, date) &&
                          "outline-primary/70 outline-2 -outline-offset-2 outline-dashed",
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        {events
                          .filter((e) => e.riderId === rider.id && on(date, e))
                          .map((e) => (
                            <EventChip key={e.id} event={e} onOpen={openEvent(e, date)} />
                          ))}
                        {mine
                          .filter((s) => s.onDate === date)
                          .map((s) => (
                            <TeamChip
                              key={s.id}
                              session={s}
                              today={today}
                              href={calendarHref({ ...query, session: s.id })}
                              landed={landed === s.id}
                              dragging={drag.draggingId === s.id}
                              dragProps={drag.source(s, s.activityId === null)}
                            />
                          ))}
                      </div>
                    </td>
                  ))}
                  <td className="py-2 pr-3 pl-1 align-top">
                    {volumes[rider.id] ? (
                      <VolumeBar compact volume={volumes[rider.id]!} />
                    ) : (
                      <span className="block text-right text-xs font-medium whitespace-nowrap tabular-nums">
                        {t("hours", {
                          done: hoursText(done, locale),
                          planned: hoursText(planned, locale),
                        })}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <CalendarDialogs
        state={dialog}
        onClose={() => setDialog(null)}
        riders={riders}
        templates={templates}
        isCoach
      />
    </div>
  );
}
