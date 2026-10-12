import { useLocale, useTranslations } from "next-intl";
import { ChartLegend } from "@/components/charts/chart-legend";
import { num } from "@/components/charts/format";
import { dayMonth } from "@/components/training/day-label";
import { EventIcon } from "@/components/training/event-icon";
import { Link } from "@/i18n/navigation";
import type { SeasonMonth, SeasonSoFar } from "@/modules/calendar/season-data";
import { referenceOf } from "@/modules/paradigms";
import { MonthBar, seasonTop } from "./month-bar";
import { monthTitle } from "./month-title";

export type YearEvent = { id: string; kind: string; title: string; startsOn: string };

/**
 * One rider's season from October (docs/adr/0093): a line on the season
 * so far against the plan, then twelve months, each with the season
 * plan's hours, the hours put in the calendar and ridden, the sessions
 * done of those planned, the races and camps by date, and a small bar
 * of the same. Each month opens its month view. The plan itself is
 * changed on the season page; this is the overview.
 */
export function RiderYear({
  months,
  soFar,
  events,
  monthHref,
  seasonHref,
}: {
  months: SeasonMonth[];
  soFar: SeasonSoFar | null;
  events: YearEvent[];
  monthHref: (month: string) => string;
  seasonHref: string;
}) {
  const t = useTranslations("calendar.year");
  const v = useTranslations("volume");
  const locale = useLocale();
  const h = (n: number) => num(n, locale, 1);
  const top = seasonTop(months.map((m) => m.volume));
  const ref = referenceOf(months[0]?.volume.basis);
  const guided = months.some((m) => m.volume.dcu !== null);

  return (
    <section aria-label={t("label")} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        {soFar && (
          <p className="text-reading">
            {t("soFar", { done: h(soFar.done) })}{" "}
            {/* October is a break with no hours, so nothing to weigh the first weeks against. */}
            {soFar.goal !== null && soFar.goal > 0
              ? t("soFarGoal", { goal: h(soFar.goal) })
              : soFar.dcu !== null && soFar.dcu > 0
                ? t("soFarDcu", { dcu: h(soFar.dcu), ref })
                : null}{" "}
            {soFar.goalSeason !== null && t("seasonGoal", { hours: h(soFar.goalSeason) })}
          </p>
        )}
        <Link
          href={seasonHref}
          className="focus-ring text-primary text-2sm rounded-sm font-medium underline-offset-2 hover:underline"
        >
          {t("toPlan")}
        </Link>
      </div>
      <ChartLegend
        items={[
          { key: "goal", label: v("goal"), mark: "bar", color: "var(--series-1)" },
          { key: "planned", label: v("planned"), mark: "outline", color: "var(--series-2)" },
          { key: "done", label: v("done"), mark: "bar", color: "var(--series-2)" },
          ...(guided
            ? [
                {
                  key: "dcu",
                  label: v("dcu", { ref }),
                  mark: "tick" as const,
                  color: "var(--foreground)",
                },
              ]
            : []),
        ]}
      />
      <ol className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-surface">
        {months.map((m) => {
          const mine = events.filter((e) => e.startsOn.slice(0, 7) === m.month);
          const dcu = m.volume.dcu && m.volume.dcu.target > 0 ? m.volume.dcu.target : null;
          return (
            <li
              key={m.month}
              className="grid gap-2 px-4 py-3 @3xl:grid-cols-[10rem_minmax(0,1fr)_minmax(0,15rem)] @3xl:items-start @3xl:gap-5"
            >
              <Link
                href={monthHref(m.month)}
                className="focus-ring hover:text-primary self-start rounded-sm text-sm font-semibold"
              >
                {monthTitle(m.month, locale)}
              </Link>
              <div className="flex min-w-0 flex-col gap-1.5">
                <MonthBar volume={m.volume} top={top} />
                <p className="text-2sm flex flex-wrap gap-x-3 tabular-nums">
                  <span>{t("done", { hours: h(m.volume.done) })}</span>
                  <span className="text-meta">
                    {m.volume.goal !== null ? t("goal", { hours: h(m.volume.goal) }) : t("noGoal")}
                  </span>
                  <span className="text-meta">{t("planned", { hours: h(m.volume.planned) })}</span>
                  {dcu !== null && (
                    <span className="text-meta">{t("dcu", { hours: h(dcu), ref })}</span>
                  )}
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-2sm tabular-nums">
                  {t("sessions", { done: m.sessionsDone, planned: m.sessions })}
                </p>
                {mine.length > 0 && (
                  <ul className="flex flex-col gap-0.5">
                    {mine.map((e) => (
                      <li key={e.id} className="text-2sm flex min-w-0 items-center gap-1.5">
                        <EventIcon kind={e.kind} />
                        <span className="text-meta tabular-nums whitespace-nowrap">
                          {dayMonth(e.startsOn, locale)}
                        </span>
                        <span className="min-w-0 truncate">{e.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
