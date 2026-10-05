import { describe, expect, it } from "vitest";
import { checkPlan } from "@/modules/calc/fuel-check";
import { carbAdvice, DEFAULT_DAY, type Day } from "@/modules/calc/fuel-day";
import { FUEL_ITEMS } from "@/modules/calc/fuel-items";
import { checkAfter, checkBefore } from "@/modules/calc/meal-check";
import { suggestDay } from "@/modules/calc/meal-suggest";
import { RIDER_CLASSES } from "@/modules/calc/reference-rider";

describe("Kadence's own day", () => {
  it("meets every goal before and after, for every class, sex, meal time and what comes next", () => {
    const misses: string[] = [];
    for (const riderClass of RIDER_CLASSES)
      for (const sex of ["female", "male"] as const)
        for (const next of ["rest", "hard", "soon"] as const)
          for (const mealHours of [2, 3, 4] as const)
            for (const bottleMl of [500, 750] as const) {
              const day: Day = { ...DEFAULT_DAY, riderClass, sex, next, mealHours, bottleMl };
              const plan = suggestDay(day);
              const during = checkPlan(day, plan.during, carbAdvice(day));
              const before = checkBefore(day, plan.before);
              const after = checkAfter(day, plan.after, during.totals.fluidL);
              if (!before.total.onTarget || after.onTarget !== after.slots.length || !during.podium)
                misses.push(`${riderClass} ${sex} ${next} ${mealHours} h ${bottleMl} ml`);
              if (before.notes.length > 0)
                misses.push(`${riderClass} ${sex} ${mealHours} h: fibre before`);
            }
    expect(misses).toEqual([]);
  });

  it("keeps fibre-rich food out of the snack and one kind of starch to a meal", () => {
    const plan = suggestDay(DEFAULT_DAY);
    expect(plan.before[1]).toEqual(["banana"]);
    for (const meal of [...plan.before, ...plan.after]) {
      expect(meal.some((id) => FUEL_ITEMS[id].fatFibre)).toBe(false);
      expect(
        new Set(meal.filter((id) => ["whiteBread", "rice", "pasta"].includes(id))).size,
      ).toBeLessThanOrEqual(1);
    }
  });
});
