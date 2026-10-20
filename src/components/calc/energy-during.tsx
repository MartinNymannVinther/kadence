"use client";

import { Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { kcalRacing, spread } from "@/modules/calc/energy";
import { checkPlan, type Note } from "@/modules/calc/fuel-check";
import { carbAdvice, gelsFor, type Day } from "@/modules/calc/fuel-day";
import { contentOf } from "@/modules/calc/fuel-items";
import { suggestPlan } from "@/modules/calc/fuel-suggest";
import type { DayTimes } from "@/modules/calc/fuel-times";
import { referenceKg } from "@/modules/calc/reference-rider";
import { EnergyBudget } from "./energy-budget";
import { EnergyGoal } from "./energy-goal";
import { ItemIcon } from "./energy-item-icon";
import { EnergyStep } from "./energy-phase";

/** The notes the example can bring with it; the rest only ever came up for a plan built by hand. */
const SHOWN: readonly Note[] = ["capped", "multiple", "practise", "heat", "cages"];

/**
 * On the bike: the goal for an hour, one way to meet it hour by hour with
 * homemade drinks and ordinary food, the recipe for the sports drink, and
 * — for a race — why the stomach cannot take back what the body uses.
 */
export function EnergyDuring({
  day,
  times,
  clock,
}: {
  day: Day;
  times: DayTimes | null;
  clock: (minutes: number) => string;
}) {
  const t = useTranslations("calculators.energy.during");
  const g = useTranslations("calculators.energy.goal");
  const items = useTranslations("calculators.energy.items");
  const warnings = useTranslations("calculators.energy.warnings");
  const locale = useLocale();
  const advice = carbAdvice(day);
  const gels = gelsFor(day);
  const lanes = suggestPlan(day, advice, { gels });
  const check = checkPlan(day, lanes, advice);
  const fluid = check.fluidPerHour;
  const carbs =
    advice.kind === "water"
      ? g("noCarbs")
      : advice.kind === "small"
        ? g("littleCarbs")
        : advice.low === advice.high
          ? g("carbsOne", { high: advice.high })
          : g("carbsHour", { low: advice.low, high: advice.high });
  const notes = check.notes.filter((n) => SHOWN.includes(n));
  const kcal =
    day.session === "race" ? spread(kcalRacing(referenceKg(day.riderClass, day.sex), 1)) : null;

  return (
    <EnergyStep
      id="energy-during"
      when={
        times ? t("whenAt", { from: clock(times.ride.from), to: clock(times.ride.to) }) : t("when")
      }
      title={t(day.session === "race" ? "titleRace" : "titleTraining")}
    >
      <EnergyGoal
        label={t("goal")}
        goals={[
          { kind: "carbs", text: carbs },
          {
            kind: "fluid",
            text: g("fluidHour", {
              low: num(fluid.low, locale, 1),
              high: num(fluid.high, locale, 1),
            }),
          },
        ]}
      />
      <p className="text-reading leading-relaxed">{t("how")}</p>
      <div className="flex flex-col gap-2">
        <h4 className="text-2sm font-semibold">{t("example")}</h4>
        <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {check.lanes.map((c) => {
            const lane = lanes[c.lane.index] ?? [];
            const content = contentOf(lane, day.bottleMl);
            return (
              <li
                key={c.lane.index}
                className="border-border bg-card flex flex-col gap-1.5 rounded-lg border p-2"
              >
                <span className="flex flex-col">
                  <span className="text-2sm font-semibold">
                    {t("hour", { hour: c.lane.index + 1 })}
                  </span>
                  {times?.lanes[c.lane.index] && (
                    <span className="text-meta text-2xs tabular-nums">
                      {t("hourAt", {
                        from: clock(times.lanes[c.lane.index]!.from),
                        to: clock(times.lanes[c.lane.index]!.to),
                      })}
                    </span>
                  )}
                </span>
                <span aria-hidden className="flex flex-wrap gap-0.5">
                  {lane.map((id, i) => (
                    <ItemIcon key={`${id}-${i}`} id={id} className="size-7" />
                  ))}
                </span>
                <span className="text-meta text-xs leading-snug">
                  {lane.length === 0
                    ? t("nothing")
                    : lane.map((id) => items(`${id}.name` as "water.name")).join(", ")}
                </span>
                <span className="text-xs font-medium tabular-nums">
                  {t("hourContent", { g: content.carbs, l: num(content.fluidL, locale, 2) })}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="text-meta text-2sm leading-relaxed">{t("recipe", { ml: day.bottleMl })}</p>
      </div>
      {kcal && <EnergyBudget kcal={kcal} gutCap={check.gutCap} />}
      <ul className="flex flex-col gap-2">
        {[
          ...notes.map((n) => warnings(n, { n: check.totals.bottles })),
          warnings(gels ? "productsGels" : "products"),
        ].map((text) => (
          <li
            key={text}
            className="bg-secondary flex items-start gap-2 rounded-md px-3 py-2 text-2sm leading-relaxed"
          >
            <Info aria-hidden className="text-meta mt-0.5 size-4 shrink-0" />
            {text}
          </li>
        ))}
      </ul>
    </EnergyStep>
  );
}
