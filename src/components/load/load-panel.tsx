import { useTranslations } from "next-intl";
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
export function LoadPanel({ insight }: { insight: RiderInsight }) {
  const t = useTranslations("load");
  const days = insight.series.map((d) => ({
    date: d.date,
    fitness: d.fitness,
    fatigue: d.fatigue,
    form: d.form,
  }));
  const trained = days.some((d) => d.fitness > 0 || d.fatigue > 0);
  return (
    <div className="flex flex-col gap-6">
      <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5">
        {trained ? (
          <LoadChart days={days} />
        ) : (
          <EmptyState variant="inline" title={t("empty")} hint={t("emptyBody")} />
        )}
        <LoadExplainer />
      </div>
      <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5">
        <h4 className="text-sm font-semibold">{t("weeks.title")}</h4>
        <WeeklyHoursChart weeks={weekBars(insight)} />
      </div>
    </div>
  );
}
