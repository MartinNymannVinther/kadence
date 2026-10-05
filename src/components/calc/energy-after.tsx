"use client";

import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { afterSlots, plateFor, type Day } from "@/modules/calc/fuel-day";
import { RECOVERY, REFUEL } from "@/modules/calc/fuel-examples";
import { EnergyExamples } from "./energy-examples";
import { EnergyGoal } from "./energy-goal";
import { EnergyStep } from "./energy-phase";
import { EnergyPlate } from "./energy-plate";

/**
 * After: carbohydrate, protein and fluid straight away for the rider's
 * class, then — with another hard session within 8 hours — carbohydrate
 * every hour for four hours, and the plate for the main meal 1–2 hours
 * later (Team Danmark; Thomas 2016).
 */
export function EnergyAfter({ day, rider }: { day: Day; rider: string }) {
  const t = useTranslations("calculators.energy.after");
  const g = useTranslations("calculators.energy.goal");
  const locale = useLocale();
  const [first] = afterSlots(day);
  const soon = day.next === "soon";
  const plate = plateFor(day);

  return (
    <>
      <EnergyStep id="energy-after" when={t("when")} title={t("title")}>
        {first && (
          <EnergyGoal
            label={t("goal", { rider })}
            goals={[
              { kind: "carbs", text: g("carbs", { low: first.carbs.low, high: first.carbs.high }) },
              ...(first.protein
                ? [
                    {
                      kind: "protein" as const,
                      text: g("protein", { low: first.protein.low, high: first.protein.high }),
                    },
                  ]
                : []),
              {
                kind: "fluid",
                text: g("fluid", { low: num(0.5, locale, 1), high: num(1, locale, 1) }),
              },
            ]}
          />
        )}
        <EnergyExamples examples={RECOVERY} protein />
        <p className="text-reading leading-relaxed">{t("drink")}</p>
        {soon && first && (
          <div className="flex flex-col gap-2">
            <h4 className="text-2sm font-semibold">
              {t("soon", { low: first.carbs.low, high: first.carbs.high })}
            </h4>
            <EnergyExamples examples={REFUEL} />
          </div>
        )}
        {day.next === "hard" && <p className="text-reading leading-relaxed">{t("hard")}</p>}
      </EnergyStep>
      <EnergyStep id="energy-dinner" when={t("dinnerWhen")} title={t("dinner")} last>
        <EnergyPlate plate={plate} />
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-reading leading-relaxed marker:text-[var(--meta)]">
          {(["pasta", "rice", "potatoes"] as const).map((d) => (
            <li key={d}>{t(`dinners.${d}`)}</li>
          ))}
        </ul>
      </EnergyStep>
    </>
  );
}
