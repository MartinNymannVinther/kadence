import type { Range } from "./energy";
import {
  afterSlots,
  beforeTargets,
  fluidAfter,
  plateFor,
  type AfterSlot,
  type Day,
} from "./fuel-day";
import { contentOf, FUEL_ITEMS, type Content, type FuelItemId } from "./fuel-items";

/**
 * The meals before and after in a plan the rider builds, held up against
 * the goals for the rider's class (fuel-day.ts). Food comes in portions,
 * so a goal counts as met within 15 g of carbohydrate, 5 g of protein and
 * a quarter of a litre — Kadence's own slack, like the hours on the bike.
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

export const MEAL_CARB_SLACK_G = 15;
export const MEAL_PROTEIN_SLACK_G = 5;
export const MEAL_FLUID_SLACK_L = 0.25;

export type MealState = "under" | "ok" | "over";

export type Measure = { value: number; target: Range; state: MealState };

export type MealCheck = {
  content: Content;
  carbs: Measure;
  protein: Measure | null;
  fluid: Measure;
  onTarget: boolean;
};

export type MealNote = "beforeFibre";

const measure = (value: number, target: Range, slack: number): Measure => ({
  value,
  target,
  state: value < target.low - slack ? "under" : value > target.high + slack ? "over" : "ok",
});

function check(
  items: readonly FuelItemId[],
  day: Day,
  target: { carbs: Range; protein: Range | null; fluid: Range },
): MealCheck {
  const content = contentOf(items, day.bottleMl);
  const carbs = measure(content.carbs, target.carbs, MEAL_CARB_SLACK_G);
  const protein = target.protein
    ? measure(content.protein, target.protein, MEAL_PROTEIN_SLACK_G)
    : null;
  const fluid = measure(content.fluidL, target.fluid, MEAL_FLUID_SLACK_L);
  return {
    content,
    carbs,
    protein,
    fluid,
    onTarget: carbs.state === "ok" && fluid.state === "ok" && (protein?.state ?? "ok") === "ok",
  };
}

const heavy = (items: readonly FuelItemId[]) => items.some((id) => FUEL_ITEMS[id].fatFibre);

/**
 * Before the start: the main meal and the snack are counted together
 * against one goal. Fibre or fat in the snack, an hour before, is said.
 */
export function checkBefore(
  day: Day,
  slots: readonly (readonly FuelItemId[])[],
): { total: MealCheck; notes: MealNote[] } {
  const items = slots.flat();
  const target = beforeTargets(day);
  const notes: MealNote[] = heavy(slots[1] ?? []) ? ["beforeFibre"] : [];
  return { total: check(items, day, { ...target, protein: null }), notes };
}

export type AfterCheck = {
  slots: MealCheck[];
  targets: AfterSlot[];
  plate: "elite" | "everyday";
  lossL: Range;
  replaceL: Range;
  onTarget: number;
};

/** After: each slot against its own goal, and the sweat not drunk back during. */
export function checkAfter(
  day: Day,
  slots: readonly (readonly FuelItemId[])[],
  drunkDuringL: number,
): AfterCheck {
  const targets = afterSlots(day);
  const checks = targets.map((target, i) => check(slots[i] ?? [], day, target));
  return {
    slots: checks,
    targets,
    plate: plateFor(day),
    ...fluidAfter(day, drunkDuringL),
    onTarget: checks.filter((c) => c.onTarget).length,
  };
}
