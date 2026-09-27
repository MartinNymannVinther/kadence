"use client";

import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { hoursText } from "@/components/training/duration";
import { addDaysIso } from "@/core/dates";
import { weeklyTotals, type WeekActivity } from "@/modules/load";
import type { CalendarActivityCard, CalendarCard } from "./types";

/**
 * The week's hours, planned beside done — and the bike's on their own
 * line, since DCU counts only hours on the bike. The done side is the load
 * model's weekly total (src/modules/load/fitness.ts); the bars say the
 * same as the numbers beside them. Under them, the week's bike hours —
 * ridden and still planned — against DCU's corridor for the rider's class,
 * with a word and an arrow as well as the band.
 */

export type Corridor = { low: number; target: number; high: number; klass: string };
export function WeekTotals({
  monday,
  sessions,
  activities,
  corridor = null,
  today,
}: {
  monday: string;
  /** Sessions before today that were not done do not count as still planned. */
  today: string;
  sessions: CalendarCard[];
  activities: CalendarActivityCard[];
  corridor?: Corridor | null;
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
  const openBike = sessions
    .filter((s) => s.sport === "bike" && !s.activity && s.onDate >= today)
    .reduce((sum, s) => sum + s.plannedMinutes, 0);
  const bikeWeek = (week?.bikeHours ?? 0) + openBike / 60;
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
      {corridor && <CorridorRow corridor={corridor} hours={bikeWeek} />}
    </dl>
  );
}

function CorridorRow({ corridor, hours }: { corridor: Corridor; hours: number }) {
  const t = useTranslations("calendar.totals");
  const locale = useLocale();
  const top = Math.max(corridor.high * 1.25, hours, 1);
  const pct = (v: number) => `${Math.min(100, (v / top) * 100)}%`;
  const state = hours > corridor.high ? "over" : hours < corridor.low ? "under" : "inside";
  const Icon = state === "over" ? ArrowUp : state === "under" ? ArrowDown : Check;
  const h = (v: number) => num(v, locale, 1);
  return (
    <div className="contents">
      <dt className="text-meta">{t("corridor")}</dt>
      <dd className="bg-secondary relative h-2 rounded-full" aria-hidden>
        <span
          className="bg-accent absolute inset-y-0 rounded-full"
          style={{
            left: pct(corridor.low),
            width: `calc(${pct(corridor.high)} - ${pct(corridor.low)})`,
          }}
        />
        <span
          className="bg-primary absolute -top-1 h-4 w-1 rounded-full"
          style={{ left: `calc(${pct(hours)} - 2px)` }}
        />
      </dd>
      <dd className="flex items-center gap-1 font-medium tabular-nums">
        <Icon aria-hidden className="size-3.5" />
        <span className="sr-only">{t(`state.${state}`)}: </span>
        {t("corridorValue", { hours: h(hours), low: h(corridor.low), high: h(corridor.high) })}
      </dd>
      <dd className="text-meta col-span-3 -mt-0.5 text-xs">
        {t("corridorNote", { klass: corridor.klass, state: t(`state.${state}`) })}
      </dd>
    </div>
  );
}
