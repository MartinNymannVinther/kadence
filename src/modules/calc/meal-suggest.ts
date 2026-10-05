import type { Range } from "./energy";
import { lanesFor } from "./fuel-check";
import { afterSlots, beforeTargets, carbAdvice, type Day } from "./fuel-day";
import { contentOf, type FuelItemId } from "./fuel-items";
import { emptyPlan, type DayPlan } from "./fuel-plan";
import { suggestPlan } from "./fuel-suggest";
import { MEAL_CARB_SLACK_G, MEAL_FLUID_SLACK_L, MEAL_PROTEIN_SLACK_G } from "./meal-check";

/**
 * Kadence's own day, for the rider who wants to see one after building
 * their own: the hours on the bike from fuel-suggest.ts, and meals before
 * and after picked from plain food — bread, honey, rice, pasta, juice,
 * a banana, chocolate milk, skyr, water — landing nearest the middle of
 * each goal. No oats or rye bread before the start, for their fibre (Team
 * Danmark: "få kostfibre"). A banana is the snack an hour before.
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

const MAX_ITEMS = 6;
const MAX_EACH = 3;
/** One kind of bread, rice or pasta to a meal, as a plate is laid. */
const STARCH: readonly FuelItemId[] = ["whiteBread", "rice", "pasta"];

const BEFORE: readonly FuelItemId[] = [
  "whiteBread",
  "honey",
  "juice",
  "rice",
  "pasta",
  "milk",
  "water",
];
const AFTER_FIRST: readonly FuelItemId[] = [
  "cocoaMilk",
  "whiteBread",
  "honey",
  "skyr",
  "banana",
  "juice",
  "water",
];
const AFTER_LATER: readonly FuelItemId[] = [
  "rice",
  "pasta",
  "whiteBread",
  "honey",
  "juice",
  "banana",
  "water",
];

type Target = { carbs: Range; protein: Range | null; fluid: Range };

const miss = (value: number, range: Range, slack: number) =>
  value < range.low - slack
    ? range.low - slack - value
    : value > range.high + slack
      ? value - range.high - slack
      : 0;
const mid = (range: Range) => (range.low + range.high) / 2;

/** The few portions, added to `base`, that come nearest the goal: every goal met first, then the middle, then fewer things. */
function fill(
  day: Day,
  target: Target,
  candidates: readonly FuelItemId[],
  base: FuelItemId[] = [],
) {
  let best: FuelItemId[] = base;
  let bestScore = Infinity;
  const score = (items: FuelItemId[]) => {
    const c = contentOf(items, day.bottleMl);
    const misses =
      miss(c.carbs, target.carbs, MEAL_CARB_SLACK_G) +
      (target.protein ? miss(c.protein, target.protein, MEAL_PROTEIN_SLACK_G) : 0) +
      miss(c.fluidL, target.fluid, MEAL_FLUID_SLACK_L) * 100;
    return (
      misses * 100 +
      Math.abs(c.carbs - mid(target.carbs)) +
      (target.protein ? Math.abs(c.protein - mid(target.protein)) : 0) +
      Math.abs(c.fluidL - mid(target.fluid)) * 20 +
      items.length * 3
    );
  };
  const walk = (from: number, items: FuelItemId[]) => {
    const s = score(items);
    if (s < bestScore) {
      bestScore = s;
      best = items;
    }
    if (items.length - base.length >= MAX_ITEMS) return;
    for (let i = from; i < candidates.length; i++) {
      const id = candidates[i]!;
      if (items.filter((x) => x === id).length >= MAX_EACH) continue;
      if (STARCH.includes(id) && items.some((x) => x !== id && STARCH.includes(x))) continue;
      walk(i, [...items, id]);
    }
  };
  walk(0, base);
  return best.slice(base.length);
}

export function suggestDay(day: Day): DayPlan {
  const plan = emptyPlan();
  const lanes = suggestPlan(day, carbAdvice(day));
  lanesFor(day.minutes).forEach((lane) => (plan.during[lane.index] = lanes[lane.index] ?? []));

  const snack: FuelItemId[] = ["banana"];
  plan.before[1] = snack;
  plan.before[0] = fill(day, { ...beforeTargets(day), protein: null }, BEFORE, snack);

  afterSlots(day).forEach((target, i) => {
    plan.after[i] = fill(day, target, i === 0 ? AFTER_FIRST : AFTER_LATER);
  });
  return plan;
}
