"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { hoursText } from "@/components/training/duration";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { CalendarDialogs, type DialogState } from "./calendar-dialogs";
import { EventChip } from "./event-chip";
import { calendarHref, type CalendarQuery } from "./href";
import { TeamChip } from "./team-chip";
import type { TemplateOption } from "./template-picker";
import type { CalendarActivityCard, CalendarCard, CalendarEventCard, RiderOption } from "./types";
import { useSessionDrag } from "./use-session-drag";
import { useWeekSessions } from "./use-week-sessions";

/**
 * The coach's week for the whole team: a row per rider, a column per day,
 * each session a small chip in its colour — what TrainingPeaks does not
 * show on one screen. It scrolls sideways on a phone with the names held
 * in place, and a chip can be dragged to another day in its own row.
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
}: {
  riders: RiderOption[];
  days: string[];
  today: string;
  sessions: CalendarCard[];
  activities: CalendarActivityCard[];
  events: CalendarEventCard[];
  templates: TemplateOption[];
  query: CalendarQuery;
}) {
  const t = useTranslations("calendar.team");
  const actions = useTranslations("calendar.actions");
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

  // On a phone the grid is wider than the screen: start it at today, not at Monday.
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
        <Button
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
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div
        ref={scroller}
        className="border-border bg-card overflow-x-auto rounded-xl border shadow-[var(--surface-shadow)]"
      >
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <caption className="sr-only">{t("caption")}</caption>
          <thead>
            <tr className="border-border border-b">
              <th
                scope="col"
                className="bg-card text-label sticky left-0 z-10 w-32 min-w-28 px-3 py-2 text-left text-xs font-medium"
              >
                {t("rider")}
              </th>
              {days.map((date) => (
                <th
                  key={date}
                  scope="col"
                  aria-current={date === today ? "date" : undefined}
                  className={cn(
                    "px-1.5 py-2 text-left align-top text-xs font-medium",
                    date === today ? "bg-accent/50 text-accent-foreground" : "text-label",
                  )}
                >
                  <span className="block first-letter:uppercase">{weekdayShort(date, locale)}</span>
                  <span className="text-meta block font-normal">{dayMonth(date, locale)}</span>
                  <span className="mt-1 flex flex-col gap-1">
                    {teamEvents
                      .filter((e) => on(date, e))
                      .map((e) => (
                        <EventChip key={e.id} event={e} onOpen={openEvent(e, date)} />
                      ))}
                  </span>
                </th>
              ))}
              <th scope="col" className="text-label w-20 px-2 py-2 text-right text-xs font-medium">
                {t("week")}
              </th>
            </tr>
          </thead>
          <tbody>
            {riders.map((rider) => {
              const mine = sessions.filter((s) => s.riderId === rider.id);
              const planned = mine.reduce((sum, s) => sum + s.plannedMinutes, 0);
              const done =
                mine.reduce((sum, s) => sum + (s.activity?.movingSeconds ?? 0), 0) / 60 +
                activities
                  .filter((a) => a.riderId === rider.id)
                  .reduce((sum, a) => sum + a.movingSeconds / 60, 0);
              return (
                <tr key={rider.id} className="border-hairline border-b last:border-b-0">
                  <th
                    scope="row"
                    className="bg-card sticky left-0 z-10 w-32 max-w-32 min-w-28 px-3 py-2 text-left align-top font-medium"
                  >
                    <Link
                      href={calendarHref({ week: query.week, rider: rider.id })}
                      className="focus-ring hover:text-primary line-clamp-2 text-2sm break-words"
                    >
                      {rider.name}
                    </Link>
                  </th>
                  {days.map((date) => (
                    <td
                      key={date}
                      {...drag.target(rider.id, date)}
                      className={cn(
                        "min-w-24 px-1 py-1.5 align-top",
                        date === today && "bg-accent/25",
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
                  <td className="text-meta px-2 py-2 text-right align-top text-xs tabular-nums">
                    {t("hours", {
                      done: hoursText(done, locale),
                      planned: hoursText(planned, locale),
                    })}
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
