import { useLocale, useTranslations } from "next-intl";
import type { CalendarCard, CalendarEventCard } from "@/components/calendar/types";
import { FormTrend } from "@/components/load/form-trend";
import type { LoadPoint } from "@/components/load/load-chart";
import { WeekGlance } from "@/components/today/week-glance";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { hoursText } from "@/components/training/duration";
import { EventIcon } from "@/components/training/event-icon";
import type { ZoneDay } from "@/components/wellbeing/zone-days";
import { ZoneStrip } from "@/components/wellbeing/zone-strip";

export type ChildView = {
  riderId: string;
  name: string;
  shareTraining: boolean;
  shareWellbeing: boolean;
  sessions: CalendarCard[];
  events: CalendarEventCard[];
  upcoming: CalendarEventCard[];
  load: LoadPoint[];
  zones: ZoneDay[];
};

/**
 * One child's week for a parent (ADR 0011): the sessions and whether they
 * were done, the hours, a simple picture of the form, what is coming —
 * races, school, exams — and how the child is doing, only if the child
 * shares it. Read-only: a parent never gets a pen.
 */
export function ChildCard({
  child,
  days,
  today,
  hrefFor,
}: {
  child: ChildView;
  days: string[];
  today: string;
  hrefFor: (sessionId: string) => string;
}) {
  const t = useTranslations("parents.child");
  const kinds = useTranslations("training.eventKind");
  const locale = useLocale();
  const planned = child.sessions.reduce((sum, s) => sum + s.plannedMinutes, 0);
  const done = child.sessions.reduce(
    (sum, s) => sum + (s.activity ? s.activity.movingSeconds / 60 : 0),
    0,
  );
  const doneCount = child.sessions.filter((s) => s.activity).length;

  return (
    <article aria-labelledby={`child-${child.riderId}`} className="flex flex-col gap-5">
      <h2 id={`child-${child.riderId}`} className="text-lg font-semibold">
        {t("title", { name: child.name })}
      </h2>

      {child.shareTraining ? (
        <>
          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">{t("week")}</h3>
              <p className="text-meta text-2sm tabular-nums">
                {t("hours", {
                  done: hoursText(done, locale),
                  planned: hoursText(planned, locale),
                  sessions: doneCount,
                  total: child.sessions.length,
                })}
              </p>
            </div>
            <WeekGlance
              days={days}
              today={today}
              sessions={child.sessions}
              events={child.events}
              hrefFor={hrefFor}
            />
          </section>
          <section className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-surface">
            <h3 className="text-sm font-semibold">{t("form")}</h3>
            {child.load.some((d) => d.fitness > 0) ? (
              <FormTrend days={child.load} name={child.name.split(" ")[0] ?? child.name} />
            ) : (
              <p className="text-meta text-2sm">{t("noForm")}</p>
            )}
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{t("upcoming")}</h3>
            {child.upcoming.length === 0 ? (
              <p className="text-meta text-2sm">{t("noUpcoming")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {child.upcoming.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-2sm">
                    <EventIcon kind={e.kind} className="size-4" />
                    <span className="text-meta w-24 shrink-0 text-xs first-letter:uppercase">
                      {weekdayShort(e.startsOn, locale)} {dayMonth(e.startsOn, locale)}
                    </span>
                    <span className="sr-only">{kinds(e.kind as "race")}: </span>
                    <span className="min-w-0 truncate font-medium">{e.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <p className="border-border bg-card rounded-xl border p-4 text-2sm leading-relaxed">
          {t("trainingHidden", { name: child.name })}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t("wellbeing")}</h3>
        {child.shareWellbeing ? (
          child.zones.some((d) => d.zone) ? (
            <>
              <ZoneStrip days={child.zones} today={today} />
              <p className="text-meta text-xs leading-relaxed">{t("wellbeingNote")}</p>
            </>
          ) : (
            <p className="text-meta text-2sm">{t("noCheckins")}</p>
          )
        ) : (
          <p className="text-meta text-2sm leading-relaxed">
            {t("wellbeingHidden", { name: child.name })}
          </p>
        )}
      </section>
    </article>
  );
}
