import { contentOf, type BottleMl, type Content, type FuelItemId } from "./fuel-items";

/**
 * Examples of meals for each window of the day, made of the portions in
 * fuel-items.ts so their carbohydrate and protein come from the food
 * database, never typed in. They follow Team Danmark's suggestions for a
 * meal before training — bread with lean toppings, oats with milk, pasta
 * or rice with lean meat (Kost og elitesport 2026, p. 33) — and Martin's
 * rice with honey; after, carbohydrate with some protein, such as
 * chocolate milk (Team Danmark, p. 33). The evening before and the meal
 * after are told as plates, without grams.
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

export type Portion = { item: FuelItemId; count: number };
export type Example = { id: string; portions: readonly Portion[] };

const p = (item: FuelItemId, count = 1): Portion => ({ item, count });

/** The main meal 3–4 hours before the start. */
export const MAIN_MEAL: readonly Example[] = [
  { id: "riceHoney", portions: [p("rice", 2), p("honey", 2)] },
  { id: "breadHoney", portions: [p("whiteBread", 2), p("honey", 2), p("juice")] },
  { id: "pastaChicken", portions: [p("pasta", 2), p("chicken")] },
  { id: "oatsMilk", portions: [p("oats"), p("milk"), p("banana")] },
];

/** The snack 1–2 hours before: easily taken up, low in fat and fibre (Team Danmark). */
export const SNACK: readonly Example[] = [
  { id: "banana", portions: [p("banana")] },
  { id: "breadHoneySmall", portions: [p("whiteBread"), p("honey")] },
  { id: "skyrBanana", portions: [p("skyr"), p("banana"), p("honey")] },
];

/** Straight after: carbohydrate and some protein. */
export const RECOVERY: readonly Example[] = [
  { id: "cocoaBanana", portions: [p("cocoaMilk", 2), p("banana")] },
  { id: "skyrBananaHoney", portions: [p("skyr"), p("banana"), p("honey")] },
  { id: "breadCheeseJuice", portions: [p("whiteBread"), p("cheese"), p("juice")] },
];

/** Each of the four hours after, with another hard session within 8 hours. */
export const REFUEL: readonly Example[] = [
  { id: "riceHoneySmall", portions: [p("rice"), p("honey")] },
  { id: "breadJuice", portions: [p("whiteBread"), p("juice")] },
  { id: "bananaRaisins", portions: [p("banana"), p("raisins")] },
];

/** What a meal of examples holds. */
export function exampleContent(example: Example, bottleMl: BottleMl): Content {
  return contentOf(
    example.portions.flatMap((portion) => Array<FuelItemId>(portion.count).fill(portion.item)),
    bottleMl,
  );
}
