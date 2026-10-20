"use client";

import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BarRows, type BarRow } from "@/components/charts/bar-rows";
import { VolumeRows } from "@/components/season/volume-rows";
import { hoursText } from "@/components/training/duration";
import { addDaysIso } from "@/core/dates";
import { DCU_2025, referenceOf } from "@/modules/paradigms";
import { weeklyTotals, type WeekActivity } from "@/modules/load";
import type { Volume } from "@/modules/season/volume";
import type { CalendarActivityCard, CalendarCard } from "./types";
import { WeekTotalsExplained } from "./week-totals-explained";

/**
 * The week's training as labelled rows (docs/adr/0104): every sport's
 * hours, put in and done; the bike's four numbers against the season plan
 * (ADR 0040) — Sæsonplan, Lagt ind, Kørt and the frame of DCU or the
 * training profile (docs/adr/0091), read through the paradigm from the
 * week's basis; and the strength sessions against DCU's two or three a
 * week, or one after mid-March, or the profile's rhythm. Under them, what
 * each number means, one tap away. The done side is the load model's
 * weekly total (src/modules/load/fitness.ts); the bike's numbers come from
 * the server.
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
  const id = useId();
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
  const strength = sessions.filter((s) => s.sport === "strength");
  const strengthDone =
    strength.filter((s) => s.activity).length +
    activities.filter((a) => a.sport === "strength").length;
  const frequency = DCU_2025.strengthFrequency(volume?.basis ?? null, monday);

  const minutesDone = (week?.hours ?? 0) * 60;
  const all: BarRow[] = [
    {
      key: "planned",
      label: t("planned"),
      value: t("hours", { hours: hoursText(planned, locale) }),
      bar: { from: 0, to: planned },
      mark: "outline",
      color: "var(--primary)",
    },
    {
      key: "done",
      label: t("done"),
      value: t("hours", { hours: hoursText(minutesDone, locale) }),
      bar: { from: 0, to: minutesDone },
      mark: "fill",
      color: "var(--primary)",
    },
  ];

  return (
    <div className="flex w-full max-w-xl flex-col gap-4 text-2sm">
      <section aria-labelledby={`${id}-all`} className="flex flex-col gap-1.5">
        <h3 id={`${id}-all`} className="text-meta text-xs font-medium">
          {t("all")}
        </h3>
        <BarRows rows={all} />
      </section>
      {volume && (
        <section aria-labelledby={`${id}-bike`} className="flex flex-col gap-1.5">
          <h3 id={`${id}-bike`} className="text-meta text-xs font-medium">
            {basisLabel ? t("bikeFor", { basis: basisLabel }) : t("bike")}
          </h3>
          <VolumeRows volume={volume} />
        </section>
      )}
      {(strength.length > 0 || strengthDone > 0 || volume) && (
        <p className="text-meta text-xs">
          {volume && !volume.guided
            ? t("strengthOwn", { done: strengthDone, planned: strength.length })
            : t("strength", {
                done: strengthDone,
                planned: strength.length,
                ref: referenceOf(volume?.basis),
                dcu:
                  frequency.perWeekMin === frequency.perWeekMax
                    ? String(frequency.perWeekMin)
                    : `${frequency.perWeekMin}–${frequency.perWeekMax}`,
              })}
        </p>
      )}
      <WeekTotalsExplained volume={volume} />
    </div>
  );
}
