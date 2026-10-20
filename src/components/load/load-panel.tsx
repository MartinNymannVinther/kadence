import { useLocale, useTranslations } from "next-intl";
import { dayMonthShort, signed } from "@/components/charts/format";
import { EmptyState } from "@/components/ui/empty-state";
import type { RiderInsight } from "@/modules/insight/rider";
import { LoadChart } from "./load-chart";
import { LoadExplainer } from "./load-explainer";
import { weekBars } from "./week-bars";
import { WeeklyHoursChart } from "./weekly-hours-chart";

/**
 * A rider's load, whole: the 90-day chart of kondition, træthed and
 * friskhed with the words that explain them, and the weeks' bike hours
 * against DCU's corridor. On the coach's rider page and the rider's own
 * today; the parents get the simpler FormTrend.
 */
export function LoadPanel({
  insight,
  firstName = null,
}: {
  insight: RiderInsight;
  /** The rider's name for the sentence under the chart; null says "you". */
  firstName?: string | null;
}) {
  const t = useTranslations("load");
  const locale = useLocale();
  const days = insight.series.map((d) => ({
    date: d.date,
    fitness: d.fitness,
    fatigue: d.fatigue,
    form: d.form,
  }));
  const trained = days.some((d) => d.fitness > 0 || d.fatigue > 0);
  const forecast = insight.forecast;
  const ahead = (forecast?.days ?? []).map((d) => ({
    date: d.date,
    fitness: d.fitness,
    fatigue: d.fatigue,
    form: d.form,
  }));
  const raceDay = forecast?.race ? ahead.find((d) => d.date === forecast.race!.date) : undefined;
  return (
    <div className="flex flex-col gap-6">
      <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-surface sm:p-5">
        {trained ? (
          <>
            <LoadChart days={days} ahead={ahead} race={forecast?.race ?? null} />
            {ahead.length > 0 && (
              <p className="text-2sm leading-relaxed">
                {forecast?.race && raceDay
                  ? t("aheadRace", {
                      name: firstName ?? t("you"),
                      form: signed(raceDay.form, locale),
                      title: forecast.race.title,
                      priority: forecast.race.priority,
                      date: dayMonthShort(forecast.race.date, locale),
                    })
                  : t("aheadNoRace", { days: ahead.length })}
              </p>
            )}
          </>
        ) : (
          <EmptyState variant="inline" title={t("empty")} hint={t("emptyBody")} />
        )}
        <LoadExplainer />
      </div>
      <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-surface sm:p-5">
        <h4 className="text-sm font-semibold">{t("weeks.title")}</h4>
        <WeeklyHoursChart weeks={weekBars(insight)} />
      </div>
    </div>
  );
}
