"use client";

import { useTranslations } from "next-intl";
import type { Day } from "@/modules/calc/fuel-day";
import { EnergyAfter } from "./energy-after";
import { EnergyBefore, EnergyDayBefore } from "./energy-before";
import { EnergyDuring } from "./energy-during";

/**
 * The recommendations for the day chosen above, as a timeline: the day
 * before, the hours before, on the bike, after and the main meal after —
 * each with its goal for the rider's class and examples of ordinary food.
 */
export function EnergyResults({ day, rider }: { day: Day; rider: string }) {
  const t = useTranslations("calculators.energy.results");
  return (
    <section
      aria-labelledby="energy-results"
      className="border-border bg-card flex flex-col gap-5 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="energy-results" className="text-lg font-semibold">
          {t("title", { rider })}
        </h2>
        <p className="text-reading leading-relaxed">{t("intro")}</p>
      </div>
      <div>
        <EnergyDayBefore day={day} />
        <EnergyBefore day={day} rider={rider} />
        <EnergyDuring day={day} />
        <EnergyAfter day={day} rider={rider} />
      </div>
    </section>
  );
}
