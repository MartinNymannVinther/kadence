import { useLocale, useTranslations } from "next-intl";
import type { CalendarCard, CalendarEventCard } from "@/components/calendar/types";
import { FormTrend } from "@/components/load/form-trend";
import type { LoadPoint } from "@/components/load/load-chart";
import type { TimePlace } from "@/components/today/time-place";
import { WeekGlance } from "@/components/today/week-glance";
import { hoursText } from "@/components/training/duration";
import type { ZoneDay } from "@/components/wellbeing/zone-days";
import type { FamilyEvent } from "@/modules/training/family-kinds";
import { ZoneStrip } from "@/components/wellbeing/zone-strip";
import { ChildThreads, type ChildThread } from "./child-threads";
import { ChildUpcoming } from "./child-upcoming";
import { FamilyEvents } from "./family-events";

export type ChildView = {
  riderId: string;
  name: string;
  shareTraining: boolean;
  shareWellbeing: boolean;
  sessions: Array<CalendarCard & TimePlace>;
  events: CalendarEventCard[];
  upcoming: CalendarEventCard[];
  /** What this parent has put into the child's calendar, from today on (ADR 0069). */
  family: FamilyEvent[];
  threads: ChildThread[];
  load: LoadPoint[];
  zones: ZoneDay[];
};

/**
 * One child, for a parent (ADR 0011, docs/adr/0063): the week with when
 * and where each session starts, what is coming the next 30 days, the
 * family's own days in the child's calendar, how the child is doing if the
 * child shares it, the conversations about the training, and a simple
 * picture of the form. The training is read-only; the one pen a parent
 * has is for the family's holidays, exams and other days (ADR 0069). With one child the page's title is the child's name, and
 * the parts are the page's own headings; with more, each child has one.
 */
export function ChildCard({
  child,
  days,
  today,
  hrefFor,
  single,
}: {
  child: ChildView;
  days: string[];
  today: string;
  hrefFor: (sessionId: string) => string;
  /** The only child: the page's title already names them. */
  single: boolean;
}) {
  const t = useTranslations("parents.child");
  const locale = useLocale();
  const planned = child.sessions.reduce((sum, s) => sum + s.plannedMinutes, 0);
  const done = child.sessions.reduce(
    (sum, s) => sum + (s.activity ? s.activity.movingSeconds / 60 : 0),
    0,
  );
  const doneCount = child.sessions.filter((s) => s.activity).length;
  const H = single ? "h2" : "h3";
  const heading = single ? "text-lg font-semibold" : "text-base font-semibold";

  return (
    <article
      aria-labelledby={single ? undefined : `child-${child.riderId}`}
      aria-label={single ? child.name : undefined}
      className="flex flex-col gap-6"
    >
      {!single && (
        <h2 id={`child-${child.riderId}`} className="text-lg font-semibold">
          {t("title", { name: child.name })}
        </h2>
      )}

      {child.shareTraining ? (
        <>
          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <H className={heading}>{t("week")}</H>
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
          <section className="flex flex-col gap-2">
            <H className={heading}>{t("upcoming")}</H>
            <ChildUpcoming events={child.upcoming} />
          </section>
          <section className="flex flex-col gap-2">
            <H className={heading}>{t("family")}</H>
            <FamilyEvents
              riderId={child.riderId}
              childName={child.name}
              events={child.family}
              today={today}
            />
          </section>
        </>
      ) : (
        <p className="border-border bg-card rounded-xl border p-4 text-2sm leading-relaxed">
          {t("trainingHidden", { name: child.name })}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <H className={heading}>{t("wellbeing")}</H>
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

      {child.shareTraining && (
        <>
          <section className="flex flex-col gap-2">
            <H className={heading}>{t("threads")}</H>
            <ChildThreads threads={child.threads} hrefFor={hrefFor} />
          </section>
          <section className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-surface">
            <H className="text-sm font-semibold">{t("form")}</H>
            {child.load.some((d) => d.fitness > 0) ? (
              <FormTrend days={child.load} name={child.name.split(" ")[0] ?? child.name} />
            ) : (
              <p className="text-meta text-2sm">{t("noForm")}</p>
            )}
          </section>
        </>
      )}
    </article>
  );
}
