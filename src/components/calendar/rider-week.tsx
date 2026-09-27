"use client";

import { useState } from "react";
import { CalendarPlus, NotebookPen, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CalendarDialogs, type DialogState } from "./calendar-dialogs";
import { DayColumn } from "./day-column";
import { calendarHref, type CalendarQuery } from "./href";
import { SessionCard } from "./session-card";
import type { TemplateOption } from "./template-picker";
import type { CalendarActivityCard, CalendarCard, CalendarEventCard, RiderOption } from "./types";
import { useSessionDrag } from "./use-session-drag";
import { useWeekSessions } from "./use-week-sessions";
import { WeekTotals } from "./week-totals";

/**
 * One rider's week: seven columns on a desktop, a day-by-day list on a
 * phone. Sessions move by dragging on a desktop and by "Flyt" everywhere;
 * the week's hours sit on top, planned beside done.
 */
export function RiderWeek({
  riderId,
  days,
  today,
  sessions: initial,
  activities,
  events,
  canWrite,
  isCoach,
  riders,
  templates,
  query,
}: {
  riderId: string;
  days: string[];
  today: string;
  sessions: CalendarCard[];
  activities: CalendarActivityCard[];
  events: CalendarEventCard[];
  canWrite: boolean;
  isCoach: boolean;
  riders: RiderOption[];
  templates: TemplateOption[];
  query: CalendarQuery;
}) {
  const t = useTranslations("calendar.actions");
  const { sessions, move, place, landed, announcement } = useWeekSessions(initial);
  const drag = useSessionDrag(move);
  const [dialog, setDialog] = useState<DialogState>(null);
  const monday = days[0] ?? today;
  const firstDay = days.includes(today) ? today : monday;
  const canPlan = canWrite && (isCoach || templates.length > 0);
  const canEditEvent = (event: CalendarEventCard) =>
    canWrite && (event.riderId !== null || isCoach);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <WeekTotals monday={monday} sessions={sessions} activities={activities} />
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            {canPlan && (
              <Button
                className="max-sm:h-11"
                onClick={() => setDialog({ kind: "session", date: firstDay, riderIds: [riderId] })}
              >
                <Plus data-icon="inline-start" />
                {t("addSession")}
              </Button>
            )}
            <Button
              variant="outline"
              className="max-sm:h-11"
              onClick={() => setDialog({ kind: "log", date: firstDay, riderId })}
            >
              <NotebookPen data-icon="inline-start" />
              {t("log")}
            </Button>
            <Button
              variant="outline"
              className="max-sm:h-11"
              onClick={() => setDialog({ kind: "event", date: firstDay, riderId })}
            >
              <CalendarPlus data-icon="inline-start" />
              {t("addEvent")}
            </Button>
          </div>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <ol className="grid gap-2.5 @4xl:grid-cols-7 @4xl:gap-2">
        {days.map((date) => {
          const daySessions = sessions.filter((s) => s.onDate === date);
          const dayActivities = activities.filter((a) => a.onDate === date);
          return (
            <DayColumn
              key={date}
              date={date}
              today={today}
              events={events.filter((e) => e.startsOn <= date && e.endsOn >= date)}
              activities={dayActivities}
              empty={daySessions.length === 0 && dayActivities.length === 0}
              isOver={drag.isOver(riderId, date)}
              dropProps={drag.target(riderId, date)}
              onAdd={
                canPlan
                  ? () => setDialog({ kind: "session", date, riderIds: [riderId] })
                  : undefined
              }
              onOpenEvent={(event) =>
                canEditEvent(event)
                  ? () => setDialog({ kind: "event", date, riderId: event.riderId, event })
                  : undefined
              }
            >
              {daySessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  today={today}
                  href={calendarHref({ ...query, session: session.id })}
                  canEdit={canWrite}
                  isCoach={isCoach}
                  riders={riders}
                  landed={landed === session.id}
                  dragging={drag.draggingId === session.id}
                  dragProps={drag.source(session, canWrite && session.activityId === null)}
                  onMoved={(onDate) => place(session.id, onDate)}
                />
              ))}
            </DayColumn>
          );
        })}
      </ol>

      <CalendarDialogs
        state={dialog}
        onClose={() => setDialog(null)}
        riders={riders}
        templates={templates}
        isCoach={isCoach}
      />
    </div>
  );
}
