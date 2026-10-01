"use client";

import { useLocale, useTranslations } from "next-intl";
import { VolumeBar } from "@/components/season/volume-bar";
import { hoursText } from "@/components/training/duration";
import { addDaysIso } from "@/core/dates";
import { strengthFrequency } from "@/modules/dcu";
import { weeklyTotals, type WeekActivity } from "@/modules/load";
import type { Volume } from "@/modules/season/volume";
import type { CalendarActivityCard, CalendarCard } from "./types";

/**
 * The week's training: every sport's hours, done of planned; the bike's
 * hours against the season plan in the four numbers every planning view
 * shares (ADR 0040) — DCU, the coach's goal, planned and done; and the
 * strength sessions against DCU's two or three a week, or one after
 * mid-March. The done side is the load model's weekly total
 * (src/modules/load/fitness.ts); the four numbers come from the server.
 */
export function WeekTotals({
  monday,
  sessions,
  activities,
  volume = null,
  basisLabel = null,
}: {
  monday: string;
  sessions: CalendarCard[];
  activities: CalendarActivityCard[];
  /** The bike's four numbers for the rider's week, when there is a rider. */
  volume?: Volume | null;
  /** The DCU class-year the numbers are read for, as words. */
  basisLabel?: string | null;
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
  const share =
    planned > 0 ? Math.min(1, ((week?.hours ?? 0) * 60) / planned) : week?.hours ? 1 : 0;
  const strength = sessions.filter((s) => s.sport === "strength");
  const strengthDone =
    strength.filter((s) => s.activity).length +
    activities.filter((a) => a.sport === "strength").length;
  const frequency = strengthFrequency(monday);

  return (
    <div className="flex w-full max-w-xl flex-col gap-3 text-2sm">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3">
        <dt className="text-meta">{t("all")}</dt>
        <dd className="bg-secondary h-2 overflow-hidden rounded-full" aria-hidden>
          <div className="bg-primary h-full rounded-full" style={{ width: `${share * 100}%` }} />
        </dd>
        <dd className="font-medium tabular-nums">
          {t("of", {
            done: hoursText((week?.hours ?? 0) * 60, locale),
            planned: hoursText(planned, locale),
          })}
        </dd>
      </dl>
      {volume && (
        <section aria-label={t("bike")} className="flex flex-col gap-1.5">
          <h3 className="text-meta text-xs font-medium">
            {basisLabel ? t("bikeFor", { basis: basisLabel }) : t("bike")}
          </h3>
          <VolumeBar volume={volume} />
        </section>
      )}
      {(strength.length > 0 || strengthDone > 0 || volume) && (
        <p className="text-meta text-xs">
          {t("strength", {
            done: strengthDone,
            planned: strength.length,
            dcu:
              frequency.perWeekMin === frequency.perWeekMax
                ? String(frequency.perWeekMin)
                : `${frequency.perWeekMin}–${frequency.perWeekMax}`,
          })}
        </p>
      )}
    </div>
  );
}
