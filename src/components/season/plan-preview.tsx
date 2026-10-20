"use client";

import { useLocale, useTranslations } from "next-intl";
import { monthLong, num } from "@/components/charts/format";
import { weekNumber } from "@/core/dates";
import type { RiderPlanPreview } from "@/modules/season/preview";
import { VolumeBar } from "./volume-bar";

/**
 * What a plan does to each rider's four numbers before it is made
 * (ADR 0040): per week or per month, the bar as it would stand with the
 * plan in the calendar, and the planned hours before and after in words.
 * The guardrails say, they forbid nothing.
 */
export function PlanPreview({
  previews,
  period,
}: {
  previews: RiderPlanPreview[];
  period: "week" | "month";
}) {
  const t = useTranslations("volume.preview");
  const locale = useLocale();
  const h = (v: number) => num(v, locale, 1);
  return (
    <div className="flex max-h-96 min-w-0 flex-col gap-3 overflow-y-auto">
      {previews.map((rider) => (
        <section key={rider.riderId} className="border-border rounded-lg border p-3">
          <h3 className="text-sm font-semibold">{rider.name}</h3>
          <ol className="mt-2 flex flex-col gap-3">
            {rider.periods.map((p) => (
              <li
                key={p.from}
                className="grid min-w-0 gap-1.5 sm:grid-cols-[6rem_minmax(0,10rem)_minmax(0,1fr)] sm:items-start sm:gap-3"
              >
                <span className="text-meta text-xs first-letter:uppercase">
                  {period === "month"
                    ? monthLong(Number(p.from.slice(5, 7)), locale)
                    : t("week", { n: weekNumber(p.from) })}
                </span>
                <VolumeBar volume={p.after} />
                <span className="text-2sm tabular-nums">
                  {t("planned", { before: h(p.before.planned), after: h(p.after.planned) })}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
      <p className="text-meta text-xs">{t("note")}</p>
    </div>
  );
}
