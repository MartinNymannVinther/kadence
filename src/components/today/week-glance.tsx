import { useLocale, useTranslations } from "next-intl";
import { COLOUR_STYLE, colourOf, stateKey } from "@/components/training/compliance-mark";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import { EventIcon } from "@/components/training/event-icon";
import type { CalendarCard, CalendarEventCard } from "@/components/calendar/types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { timePlaceText, type TimePlace } from "./time-place";

/**
 * A week at a glance, read-only: each day with its sessions (title,
 * length, how it went, and when and where it starts if the coach said)
 * and its events, with when and where they start and who drives. The
 * rider's own week on Mig, and each child's week for a parent.
 */
export function WeekGlance({
  days,
  today,
  sessions,
  events,
  hrefFor,
}: {
  days: string[];
  today: string;
  sessions: Array<CalendarCard & TimePlace>;
  events: CalendarEventCard[];
  /** Where a session opens, or nothing to show it without a link. */
  hrefFor?: (sessionId: string) => string;
}) {
  const t = useTranslations("today.week");
  const states = useTranslations("training.state");
  const kinds = useTranslations("training.eventKind");
  const training = useTranslations("training");
  const duration = useTranslations("training.duration");
  const locale = useLocale();

  return (
    <ol className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-surface">
      {days.map((date) => {
        const day = sessions.filter((s) => s.onDate === date);
        const dayEvents = events.filter((e) => e.startsOn <= date && e.endsOn >= date);
        return (
          <li
            key={date}
            aria-current={date === today ? "date" : undefined}
            className={cn(
              "grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 px-4 py-2.5 first:rounded-t-xl last:rounded-b-xl",
              date === today && "bg-accent/40",
            )}
          >
            <span className="flex flex-col text-2sm leading-tight">
              <span className="font-semibold first-letter:uppercase">
                {weekdayShort(date, locale)}
              </span>
              <span className="text-meta text-xs">{dayMonth(date, locale)}</span>
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              {dayEvents.map((e) => {
                // When, where and who drives, on the day it starts (docs/backlog.md P2-03).
                const first = e.startsOn === date;
                const when = first ? timePlaceText(e, locale) : null;
                const transport = first ? e.transportNote.trim() : "";
                return (
                  <span key={e.id} className="text-sticky-ink flex min-w-0 flex-col text-xs">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <EventIcon kind={e.kind} />
                      <span className="sr-only">{kinds(e.kind as "race")}: </span>
                      <span className="truncate">{e.title}</span>
                    </span>
                    {when && <span className="text-meta truncate pl-5">{when}</span>}
                    {transport && (
                      <span className="text-meta pl-5">
                        {training("transport", { note: transport })}
                      </span>
                    )}
                  </span>
                );
              })}
              {day.length === 0 && dayEvents.length === 0 && (
                <span className="text-meta text-xs">{t("nothing")}</span>
              )}
              {day.map((s) => {
                const colour = colourOf(s, today);
                const Icon = COLOUR_STYLE[colour].icon;
                const state = states(
                  stateKey(colour, s.activity !== null, s.onDate === today) as "planned",
                );
                const when = timePlaceText(s, locale);
                const body = (
                  <>
                    <SportIcon sport={s.sport} className="size-3.5" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{s.title}</span>
                      {when && <span className="text-meta truncate text-xs">{when}</span>}
                    </span>
                    {s.plannedMinutes > 0 && (
                      <span className="text-meta shrink-0 text-xs tabular-nums">
                        {durationText(s.plannedMinutes, duration)}
                      </span>
                    )}
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full",
                        COLOUR_STYLE[colour].chip,
                      )}
                      title={state}
                    >
                      <Icon aria-hidden className="size-3" />
                      <span className="sr-only">{state}</span>
                    </span>
                  </>
                );
                return hrefFor ? (
                  <Link
                    key={s.id}
                    href={hrefFor(s.id)}
                    scroll={false}
                    className="focus-ring hover:text-primary flex min-h-8 min-w-0 items-center gap-2 text-2sm"
                  >
                    {body}
                  </Link>
                ) : (
                  <span key={s.id} className="flex min-h-8 min-w-0 items-center gap-2 text-2sm">
                    {body}
                  </span>
                );
              })}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
