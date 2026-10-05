"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { checkPlan, lanesFor } from "@/modules/calc/fuel-check";
import {
  afterSlots,
  allowedLossL,
  carbAdvice,
  DEFAULT_DAY,
  type Day,
} from "@/modules/calc/fuel-day";
import { emptyPlan, isEmpty, type DayPlan } from "@/modules/calc/fuel-plan";
import { checkAfter, checkBefore } from "@/modules/calc/meal-check";
import { suggestDay } from "@/modules/calc/meal-suggest";
import { DEFAULT_RACE, raceFuel, type RaceInput } from "@/modules/calc/race-fuel";
import { referenceAge, referenceKg } from "@/modules/calc/reference-rider";
import { EnergyBuilder } from "./energy-builder";
import { EnergyInputs } from "./energy-inputs";
import { EnergySetup } from "./energy-setup";

/**
 * Energy for a race or a training session, as a day the rider builds
 * (ADR 0047, 0056): what the day is, then meals before, the hours on the
 * bike and meals after dragged together from the pantry, each held up
 * against its goal and the hour on the bike against what the body uses
 * and the stomach can take. The goals come from the rider's class and
 * sex, never a weight typed in. It runs in the browser and keeps nothing.
 */
export function EnergyCalculator() {
  const t = useTranslations("calculators.energy.setup");
  const [day, setDay] = useState<Day>(DEFAULT_DAY);
  const [effort, setEffort] = useState<RaceInput>(DEFAULT_RACE);
  const [plan, setPlanState] = useState<DayPlan>(emptyPlan);
  /** The rider's own plan, kept aside from the moment Kadence's is put on the board until it is asked back. */
  const [mine, setMine] = useState<DayPlan | null>(null);

  const setDayKey = useCallback(<K extends keyof Day>(key: K, value: Day[K]) => {
    setDay((current) => ({ ...current, [key]: value }));
  }, []);
  const setEffortKey = <K extends keyof RaceInput>(key: K, value: RaceInput[K]) =>
    setEffort((current) => ({ ...current, [key]: value }));
  const setPlan = useCallback((update: (plan: DayPlan) => DayPlan) => setPlanState(update), []);

  const advice = useMemo(() => carbAdvice(day), [day]);
  const during = useMemo(() => checkPlan(day, plan.during, advice), [day, plan.during, advice]);
  const before = useMemo(() => checkBefore(day, plan.before), [day, plan.before]);
  const after = useMemo(
    () => checkAfter(day, plan.after, during.totals.fluidL),
    [day, plan.after, during.totals.fluidL],
  );
  const empty = isEmpty(plan, {
    before: plan.before.length,
    during: lanesFor(day.minutes).length,
    after: afterSlots(day).length,
  });

  const answer = raceFuel({
    ...effort,
    minutes: day.minutes,
    celsius: day.celsius,
    gutTrained: day.gutTrained,
    bottleMl: day.bottleMl,
    weightKg: referenceKg(day.riderClass, day.sex),
    age: referenceAge(day.riderClass),
    sex: day.sex,
  });
  const energy = answer.energy;
  const effortWarnings = answer.warnings.filter((w) => w === "heartRateAge" || w === "speedSolo");
  const hours = day.minutes / 60;
  const kcalPerHour =
    energy.kind === "estimate"
      ? { low: energy.kcal.low / hours, high: energy.kcal.high / hours }
      : null;
  const rider = t(`rider.${day.sex}`, { riderClass: day.riderClass });

  return (
    <div className="flex flex-col gap-6">
      <EnergySetup day={day} set={setDayKey} />
      <EnergyBuilder
        day={day}
        onDay={setDayKey}
        plan={plan}
        setPlan={setPlan}
        empty={empty}
        before={before}
        during={during}
        after={after}
        rider={rider}
        kcalPerHour={kcalPerHour}
        allowedLossL={allowedLossL(day)}
        effort={<EnergyInputs input={effort} set={setEffortKey} warnings={effortWarnings} />}
        suggested={mine !== null}
        onSuggest={() => {
          setMine(plan);
          setPlanState(suggestDay(day));
        }}
        onMine={() => {
          if (mine) setPlanState(mine);
          setMine(null);
        }}
      />
    </div>
  );
}
