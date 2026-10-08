"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { dayMonthYear } from "@/components/training/day-label";
import { Link } from "@/i18n/navigation";
import type { Period, Records } from "@/modules/load";
import { PeriodSelect } from "./period-select";

/**
 * A rider's records, the rider against themselves (ADR 0013): the best
 * watt over five durations, the longest ride, the most climbing and the
 * longest time, for the last month, half year, year or ever — each a link
 * to the ride it was set on. No W/kg, no one else's numbers.
 */
export function RecordsCard({ byPeriod }: { byPeriod: Record<Period, Records> }) {
  const t = useTranslations("records");
  const best = useTranslations("activities.best");
  const sports = useTranslations("training.sport");
  const locale = useLocale();
  const [period, setPeriod] = useState<Period>("year");
  const r = byPeriod[period];
  const rows: Array<{ key: string; label: string; value: string; holder: Records["longestKm"] }> = [
    ...r.power.map((p) => ({
      key: `p${p.seconds}`,
      label: best(`d${p.seconds}` as "d5"),
      value: t("watt", { w: p.watts }),
      holder: { ...p, value: p.watts },
    })),
    {
      key: "km",
      label: t("longestKm"),
      value: r.longestKm ? t("km", { km: num(r.longestKm.value, locale, 1) }) : "",
      holder: r.longestKm,
    },
    {
      key: "climb",
      label: t("mostClimbing"),
      value: r.mostClimbingM ? t("m", { m: num(r.mostClimbingM.value, locale) }) : "",
      holder: r.mostClimbingM,
    },
    {
      key: "hours",
      label: t("longestHours"),
      value: r.longestHours ? t("h", { h: num(r.longestHours.value, locale, 1) }) : "",
      holder: r.longestHours,
    },
  ].filter((row) => row.holder);

  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-surface sm:p-5">
      <PeriodSelect value={period} onChange={setPeriod} label={t("periodLabel")} />
      {rows.length === 0 ? (
        <p className="text-meta text-2sm">{t("none")}</p>
      ) : (
        <ul className="divide-hairline flex flex-col divide-y">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center gap-3 py-2 text-2sm">
              <Trophy aria-hidden className="text-chart-4 size-4 shrink-0" />
              <span className="w-28 shrink-0 sm:w-36">{row.label}</span>
              <span className="font-semibold tabular-nums">{row.value}</span>
              <Link
                href={`/activities/${row.holder!.activityId}`}
                className="focus-ring text-primary ml-auto min-w-0 truncate text-right text-xs font-medium hover:underline"
              >
                {/* A ride that came without a name goes by its sport; records are rides on the bike. */}
                {dayMonthYear(row.holder!.onDate, locale)} · {row.holder!.title || sports("bike")}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-meta text-xs leading-relaxed">{t("note")}</p>
    </div>
  );
}
