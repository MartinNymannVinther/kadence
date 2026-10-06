"use client";

import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { beforeTargets, type Day } from "@/modules/calc/fuel-day";
import { MAIN_MEAL, SNACK } from "@/modules/calc/fuel-examples";
import type { DayTimes } from "@/modules/calc/fuel-times";
import { EnergyExamples } from "./energy-examples";
import { EnergyGoal } from "./energy-goal";
import { EnergyStep } from "./energy-phase";
import { EnergyPlate } from "./energy-plate";

function Points({ points }: { points: readonly string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-reading leading-relaxed marker:text-[var(--meta)]">
      {points.map((point) => (
        <li key={point}>{point}</li>
      ))}
    </ul>
  );
}

/**
 * The day before: drink through the day and eat plenty of carbohydrate,
 * so the stores are full (Team Danmark), the Elite plate for dinner, and
 * before a race DCU's short ride to open the legs.
 */
export function EnergyDayBefore({ day }: { day: Day }) {
  const d = useTranslations("calculators.energy.dayBefore");
  return (
    <EnergyStep id="energy-day-before" when={d("when")} title={d("title")}>
      <Points points={[d("drink"), d("eat"), ...(day.session === "race" ? [d("dcu")] : [])]} />
      <div className="flex flex-col gap-1.5">
        <span className="text-2sm font-semibold">{d("dinner")}</span>
        <EnergyPlate plate="elite" />
        <Points points={[d("dinners.pasta"), d("dinners.rice"), d("dinners.potatoes")]} />
      </div>
    </EnergyStep>
  );
}

/**
 * The hours before the start: a main meal 3–4 hours before and a snack
 * 1–2 hours before (Team Danmark), together about the goal for the
 * rider's class, with examples, and ½–1 l to drink.
 */
export function EnergyBefore({
  day,
  rider,
  times,
  clock,
}: {
  day: Day;
  rider: string;
  times: DayTimes | null;
  clock: (minutes: number) => string;
}) {
  const t = useTranslations("calculators.energy.before");
  const g = useTranslations("calculators.energy.goal");
  const locale = useLocale();
  const target = beforeTargets(day);

  return (
    <EnergyStep
      id="energy-before"
      when={times ? t("whenAt", { from: clock(times.mainMeal.from) }) : t("when")}
      title={t("title")}
    >
      <EnergyGoal
        label={t("goal", { rider })}
        goals={[
          { kind: "carbs", text: g("carbs", { low: target.carbs.low, high: target.carbs.high }) },
          {
            kind: "fluid",
            text: g("fluid", {
              low: num(target.fluid.low, locale, 1),
              high: num(target.fluid.high, locale, 1),
            }),
          },
        ]}
      />
      <div className="flex flex-col gap-2">
        <h4 className="text-2sm font-semibold">
          {times
            ? t("mealAt", { from: clock(times.mainMeal.from), to: clock(times.mainMeal.to) })
            : t("meal")}
        </h4>
        <EnergyExamples examples={MAIN_MEAL} />
        <p className="text-meta text-2sm leading-relaxed">{t("mealNote")}</p>
        {times?.early && (
          <p className="bg-sticky text-sticky-ink rounded-md px-3 py-2 text-2sm leading-relaxed">
            {t("early", { start: clock(times.ride.from) })}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <h4 className="text-2sm font-semibold">
          {times
            ? t("snackAt", { from: clock(times.snack.from), to: clock(times.snack.to) })
            : t("snack")}
        </h4>
        <EnergyExamples examples={SNACK} />
        <p className="text-meta text-2sm leading-relaxed">
          {t(day.session === "training" ? "snackNoteTraining" : "snackNote")}
        </p>
      </div>
    </EnergyStep>
  );
}
