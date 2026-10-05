"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { DEFAULT_DAY, type Day } from "@/modules/calc/fuel-day";
import { EnergyInputs } from "./energy-inputs";
import { EnergyResults } from "./energy-results";

/**
 * Energy for a race or a training session (ADR 0047, 0056): what the day
 * is, then general recommendations for it as a timeline — the day before,
 * the hours before, on the bike and after — with the goals worked out for
 * a typical rider in the class and sex chosen, never a weight typed in,
 * and examples of ordinary food. It runs in the browser and keeps nothing.
 */
export function EnergyCalculator() {
  const t = useTranslations("calculators.energy.setup");
  const [day, setDay] = useState<Day>(DEFAULT_DAY);
  const set = useCallback(<K extends keyof Day>(key: K, value: Day[K]) => {
    setDay((current) => ({ ...current, [key]: value }));
  }, []);
  const rider = t(`rider.${day.sex}`, { riderClass: day.riderClass });

  return (
    <div className="flex flex-col gap-6">
      <EnergyInputs day={day} set={set} />
      <EnergyResults day={day} rider={rider} />
    </div>
  );
}
