import { describe, expect, it } from "vitest";
import { afterSlots, beforeTargets, DEFAULT_DAY, type Day } from "@/modules/calc/fuel-day";
import {
  exampleContent,
  MAIN_MEAL,
  RECOVERY,
  REFUEL,
  SNACK,
  type Example,
} from "@/modules/calc/fuel-examples";
import { FUEL_ITEMS } from "@/modules/calc/fuel-items";

const DAY: Day = { ...DEFAULT_DAY, riderClass: "U17", sex: "male" };
const carbs = (e: Example) => exampleContent(e, 750).carbs;
const heavy = (e: Example) => e.portions.some((p) => FUEL_ITEMS[p.item].fatFibre);

describe("the examples", () => {
  it("count rice with honey from the food database: 5 dl rice and 2 tbsp honey", () => {
    expect(carbs(MAIN_MEAL.find((e) => e.id === "riceHoney")!)).toBe(146);
  });

  it("before the start: a main meal near the goal, and a snack light and low in fibre", () => {
    const goal = beforeTargets(DAY).carbs;
    for (const meal of MAIN_MEAL.filter((e) => e.id !== "oatsMilk")) {
      expect(carbs(meal)).toBeGreaterThanOrEqual(goal.low - 40);
      expect(carbs(meal)).toBeLessThanOrEqual(goal.high);
    }
    for (const snack of SNACK) {
      expect(heavy(snack)).toBe(false);
      expect(carbs(snack)).toBeLessThanOrEqual(70);
    }
  });

  it("after: carbohydrate and protein within the goal for a U17 boy, give or take a portion", () => {
    const [first] = afterSlots(DAY);
    for (const meal of RECOVERY) {
      const c = exampleContent(meal, 750);
      expect(c.carbs).toBeGreaterThanOrEqual(first!.carbs.low - 15);
      expect(c.carbs).toBeLessThanOrEqual(first!.carbs.high + 15);
      expect(c.protein).toBeGreaterThanOrEqual(first!.protein!.low - 5);
    }
    for (const meal of REFUEL) {
      expect(carbs(meal)).toBeGreaterThanOrEqual(first!.carbs.low - 15);
      expect(carbs(meal)).toBeLessThanOrEqual(first!.carbs.high + 15);
    }
  });

  it("use no fibre-rich food after, when the stores are to fill fast", () => {
    for (const meal of [...RECOVERY, ...REFUEL]) expect(heavy(meal)).toBe(false);
  });
});
