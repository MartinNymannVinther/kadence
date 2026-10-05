"use client";

import { useCallback, useMemo, useState } from "react";
import { checkPlan, type FuelRace, type Plan } from "@/modules/calc/fuel-check";
import { emptyPlan, fullLength, isEmpty } from "@/modules/calc/fuel-plan";
import { suggestPlan } from "@/modules/calc/fuel-suggest";
import { DEFAULT_RACE, raceFuel, type RaceInput } from "@/modules/calc/race-fuel";
import { EnergyBuilder } from "./energy-builder";
import { EnergyInputs } from "./energy-inputs";
import { EnergyRace } from "./energy-race";
import { EnergyResults } from "./energy-results";

/**
 * The energy calculator as a plan the rider builds (ADR 0047, 0056): the
 * race, then bottles and food dragged into its hours while a rider on the
 * road shows how the plan meets the recommendations
 * (src/modules/calc/fuel-check.ts), with Kadence's own plan a button
 * away. Below, for whoever wants it, the energy the race costs and the
 * meals before and after. It runs in the browser and keeps nothing; the
 * weight it may be given never leaves the page.
 */
export function EnergyCalculator() {
  const [input, setInput] = useState<RaceInput>(DEFAULT_RACE);
  const [plan, setPlanState] = useState<Plan>(emptyPlan);
  /** The rider's own plan, kept aside from the moment Kadence's is put on the board until it is asked back. */
  const [mine, setMine] = useState<Plan | null>(null);

  const set = <K extends keyof RaceInput>(key: K, value: RaceInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));
  const { minutes, celsius, gutTrained, bottleMl } = input;
  const race = useMemo<FuelRace>(
    () => ({ minutes, celsius, gutTrained, bottleMl }),
    [minutes, celsius, gutTrained, bottleMl],
  );
  const check = useMemo(() => checkPlan(race, plan), [race, plan]);
  const lanes = check.lanes.length;
  const empty = isEmpty(plan, lanes);
  const hours = minutes / 60;

  const setPlan = useCallback((update: (plan: Plan) => Plan) => {
    setPlanState((p) => fullLength(update(p)));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <EnergyRace
        minutes={minutes}
        celsius={celsius}
        gutTrained={gutTrained}
        onMinutes={(m) => set("minutes", m)}
        onCelsius={(c) => set("celsius", c)}
        onGutTrained={(g) => set("gutTrained", g)}
      />
      <EnergyBuilder
        check={check}
        plan={plan}
        setPlan={setPlan}
        empty={empty}
        celsius={celsius}
        gutTrained={gutTrained}
        bottleMl={bottleMl}
        onBottleMl={(ml) => set("bottleMl", ml)}
        suggested={mine !== null}
        onSuggest={() => {
          setMine(plan);
          setPlanState(fullLength(suggestPlan(race)));
        }}
        onMine={() => {
          if (mine) setPlanState(mine);
          setMine(null);
        }}
      />
      <EnergyInputs input={input} set={set} />
      <EnergyResults
        input={input}
        answer={raceFuel(input)}
        planCarbsPerHour={hours > 0 ? check.totals.carbs / hours : 0}
      />
    </div>
  );
}
