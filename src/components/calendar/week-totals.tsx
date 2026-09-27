"use client";

import { useLocale, useTranslations } from "next-intl";
import { hoursText } from "@/components/training/duration";
import { addDaysIso } from "@/core/dates";
import { weeklyTotals, type WeekActivity } from "@/modules/load";
import type { CalendarActivityCard, CalendarCard } from "./types";

/**
 * The week's hours, planned beside done — and the bike's on their own
 * line, since DCU counts only hours on the bike. The done side is the load
 * model's weekly total (src/modules/load/fitness.ts); the bars say the
 * same as the numbers beside them.
 */
export function WeekTotals({
  monday,
  sessions,
  activities,
}: {
  monday: string;
  sessions: CalendarCard[];
  activities: CalendarActivityCard[];
}) {
  const t = useTranslations("calendar.totals");
  const locale = useLocale();
  const done: WeekActivity[] = [
    ...sessions.flatMap((s) =>
      s.activity
        ? [
            {
              date: s.onDate,
              seconds: s.activity.movingSeconds,
              load: s.activity.load,
              sport: s.sport as WeekActivity["sport"],
            },
          ]
        : [],
    ),
    ...activities.map((a) => ({
      date: a.onDate,
      seconds: a.movingSeconds,
      load: null,
      sport: a.sport as WeekActivity["sport"],
    })),
  ];
  const week = weeklyTotals(done, monday, addDaysIso(monday, 6))[0];
  const planned = sessions.reduce((sum, s) => sum + s.plannedMinutes, 0);
  const plannedBike = sessions
    .filter((s) => s.sport === "bike")
    .reduce((sum, s) => sum + s.plannedMinutes, 0);
  const rows = [
    { key: "all", label: t("all"), planned, done: (week?.hours ?? 0) * 60 },
    { key: "bike", label: t("bike"), planned: plannedBike, done: (week?.bikeHours ?? 0) * 60 },
  ];

  return (
    <dl className="grid w-full max-w-md grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-2sm">
      {rows.map((row) => {
        const share = row.planned > 0 ? Math.min(1, row.done / row.planned) : row.done > 0 ? 1 : 0;
        return (
          <div key={row.key} className="contents">
            <dt className="text-meta">{row.label}</dt>
            <dd className="bg-secondary h-2 overflow-hidden rounded-full" aria-hidden>
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${share * 100}%` }}
              />
            </dd>
            <dd className="font-medium tabular-nums">
              {t("of", {
                done: hoursText(row.done, locale),
                planned: hoursText(row.planned, locale),
              })}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
