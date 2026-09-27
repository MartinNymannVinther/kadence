import { useLocale, useTranslations } from "next-intl";
import { calendarHref } from "@/components/calendar/href";
import type { CalendarCard, CalendarEventCard, RiderOption } from "@/components/calendar/types";
import { ComplianceMark, colourOf } from "@/components/training/compliance-mark";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { durationText } from "@/components/training/duration";
import { EventIcon } from "@/components/training/event-icon";
import { SportIcon } from "@/components/training/sport-icon";
import { Link } from "@/i18n/navigation";

/**
 * The coach's today: every rider with today's sessions and whether they
 * are done, and the team's events this week. Who needs attention is wave
 * 2's; this is the plain picture.
 */
export function CoachToday({
  riders,
  sessions,
  teamEvents,
  today,
  hrefFor,
}: {
  riders: RiderOption[];
  sessions: CalendarCard[];
  teamEvents: CalendarEventCard[];
  today: string;
  hrefFor: (sessionId: string) => string;
}) {
  const t = useTranslations("today.coach");
  const duration = useTranslations("training.duration");
  const locale = useLocale();
  const doneCount = sessions.filter((s) => s.activity).length;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="coach-team" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="coach-team" className="text-lg font-semibold">
            {t("title")}
          </h2>
          <p className="text-meta text-2sm">
            {t("summary", { done: doneCount, total: sessions.length })}
          </p>
        </div>
        <ul className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-[var(--surface-shadow)]">
          {riders.map((rider) => {
            const mine = sessions.filter((s) => s.riderId === rider.id);
            return (
              <li
                key={rider.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-4"
              >
                <Link
                  href={calendarHref({ rider: rider.id })}
                  className="focus-ring hover:text-primary text-sm font-semibold sm:w-40 sm:shrink-0"
                >
                  {rider.name}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  {mine.length === 0 && <span className="text-meta text-2sm">{t("rest")}</span>}
                  {mine.map((s) => (
                    <Link
                      key={s.id}
                      href={hrefFor(s.id)}
                      scroll={false}
                      className="focus-ring hover:text-primary flex min-h-11 min-w-0 flex-wrap items-center gap-2 text-2sm sm:min-h-8"
                    >
                      <SportIcon sport={s.sport} />
                      <span className="min-w-0 truncate font-medium">{s.title}</span>
                      {s.plannedMinutes > 0 && (
                        <span className="text-meta text-xs">
                          {durationText(s.plannedMinutes, duration)}
                        </span>
                      )}
                      <ComplianceMark
                        colour={colourOf(s, today)}
                        done={s.activity !== null}
                        isToday
                      />
                    </Link>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="coach-events" className="flex flex-col gap-3">
        <h2 id="coach-events" className="text-lg font-semibold">
          {t("events")}
        </h2>
        {teamEvents.length === 0 ? (
          <p className="text-meta text-2sm">{t("noEvents")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {teamEvents.map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-2sm">
                <EventIcon kind={e.kind} className="size-4" />
                <span className="text-meta w-24 shrink-0 text-xs first-letter:uppercase">
                  {weekdayShort(e.startsOn, locale)} {dayMonth(e.startsOn, locale)}
                </span>
                <span className="min-w-0 truncate font-medium">{e.title}</span>
                {e.priority && <span className="text-meta text-xs">{e.priority}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
