import { describe, expect, it } from "vitest";
import { checkPlan, MAX_MINUTES, MIN_MINUTES, type FuelRace } from "@/modules/calc/fuel-check";
import { suggestPlan } from "@/modules/calc/fuel-suggest";

/** Notes that would point out a flaw in the plan itself, as opposed to advice about the race. */
const FLAWS = ["sodium", "fuelHeat", "riceCakeLate", "fatFibre", "pastFinish"];

describe("Kadence's own plan", () => {
  it("is on target every hour, without a flaw, for every race the calculator takes", () => {
    const misses: string[] = [];
    for (let minutes = MIN_MINUTES; minutes <= MAX_MINUTES; minutes += 15)
      for (const celsius of [-5, 5, 18, 24, 25, 30, 40])
        for (const gutTrained of [false, true])
          for (const bottleMl of [500, 750] as const) {
            const race: FuelRace = { minutes, celsius, gutTrained, bottleMl };
            const check = checkPlan(race, suggestPlan(race));
            const flaws = check.notes.filter((n) => FLAWS.includes(n));
            if (!check.podium || flaws.length > 0)
              misses.push(`${minutes} min ${celsius} °C ${gutTrained} ${bottleMl}: ${flaws}`);
          }
    expect(misses).toEqual([]);
  });

  it("two hours at 18 °C without practice: one sports drink an hour", () => {
    expect(suggestPlan({ minutes: 120, celsius: 18, gutTrained: false, bottleMl: 750 })).toEqual([
      ["drink"],
      ["drink"],
    ]);
  });

  it("uses the 8 % bottle above 60 g an hour, never in heat, and no rice cakes after two hours", () => {
    const trained = suggestPlan({ minutes: 240, celsius: 18, gutTrained: true, bottleMl: 750 });
    expect(trained.flat()).toContain("fuel");
    expect(trained.slice(2).flat()).not.toContain("riceCake");
    const hot = suggestPlan({ minutes: 240, celsius: 30, gutTrained: true, bottleMl: 750 });
    expect(hot.flat()).not.toContain("fuel");
    expect(hot.slice(1).flat()).not.toContain("riceCake");
  });

  it("gives water alone under 45 minutes", () => {
    expect(suggestPlan({ minutes: 30, celsius: 18, gutTrained: false, bottleMl: 500 })).toEqual([
      ["water"],
    ]);
  });
});
