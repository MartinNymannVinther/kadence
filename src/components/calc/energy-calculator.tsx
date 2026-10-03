"use client";

import { useState } from "react";
import { DEFAULT_RACE, raceFuel, type RaceInput } from "@/modules/calc/race-fuel";
import { EnergyInputs } from "./energy-inputs";
import { EnergyResults } from "./energy-results";

/**
 * The energy calculator (ADR 0047): the race in, the energy, the fuel
 * plan and the meals before and after out (src/modules/calc/race-fuel.ts).
 * It runs in the browser and keeps nothing; the weight it may be given
 * never leaves the page.
 */
export function EnergyCalculator() {
  const [input, setInput] = useState<RaceInput>(DEFAULT_RACE);
  const set = <K extends keyof RaceInput>(key: K, value: RaceInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));

  return (
    <div className="flex flex-col gap-6">
      <EnergyInputs input={input} set={set} />
      <EnergyResults input={input} answer={raceFuel(input)} />
    </div>
  );
}
