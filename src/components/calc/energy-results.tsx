"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Day } from "@/modules/calc/fuel-day";
import { dayTimes } from "@/modules/calc/fuel-times";
import { EnergyAfter } from "./energy-after";
import { EnergyBefore, EnergyDayBefore } from "./energy-before";
import { EnergyDuring } from "./energy-during";
import { EnergyPrint } from "./energy-print";
import { formatClock } from "./format";

/**
 * The recommendations for the day chosen above, as a timeline: the day
 * before, the hours before, on the bike, after and the main meal after —
 * each with its goal for the rider's class, examples of ordinary food and,
 * when the start time is given, about when on the clock.
 */
export function EnergyResults({ day, rider }: { day: Day; rider: string }) {
  const t = useTranslations("calculators.energy.results");
  const locale = useLocale();
  const times = day.startMin === null ? null : dayTimes(day.startMin, day.minutes);
  const clock = (minutes: number) => formatClock(minutes, locale);
  const setup = useTranslations("calculators.energy.setup");
  const hours = Math.floor(day.minutes / 60);
  const rest = day.minutes % 60;
  const summary = [
    day.session === "race"
      ? setup("race")
      : `${setup("training")} (${setup(`intensity.${day.intensity}`).toLowerCase()})`,
    ...(day.startMin === null ? [] : [t("startAt", { time: clock(day.startMin) })]),
    hours === 0
      ? setup("durationMinutes", { m: rest })
      : rest === 0
        ? setup("durationHours", { h: hours })
        : setup("durationMixed", { h: hours, m: rest }),
    setup("celsiusShown", { c: day.celsius }),
    t("next", { next: setup(`next.${day.next}.title`) }),
  ].join(" · ");
  return (
    <section
      aria-labelledby="energy-results"
      className="border-border bg-card flex flex-col gap-5 rounded-xl border p-4 shadow-surface [print-color-adjust:exact] sm:p-5 print:border-0 print:p-0 print:shadow-none"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="energy-results" className="text-lg font-semibold">
            {t("title", { rider })}
          </h2>
          <p className="text-2sm font-medium tabular-nums">{summary}</p>
        </div>
        <EnergyPrint title={t("fileName", { rider, summary })} />
      </div>
      <p className="text-reading leading-relaxed">{t("intro")}</p>
      <div>
        <EnergyDayBefore day={day} />
        <EnergyBefore day={day} rider={rider} times={times} clock={clock} />
        <EnergyDuring day={day} times={times} clock={clock} />
        <EnergyAfter day={day} rider={rider} times={times} clock={clock} />
      </div>
      <p className="text-meta hidden text-xs leading-relaxed print:block">{t("printFooter")}</p>
    </section>
  );
}
