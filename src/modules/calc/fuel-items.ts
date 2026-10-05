/**
 * What a rider can put in a race plan: four bottles and four kinds of
 * food. The numbers are docs/research/ernaering.md, section 2, where
 * each recipe and product has its source; homemade recipes are counted
 * at the middle of their range.
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

export const FUEL_ITEM_IDS = [
  "water",
  "saltWater",
  "drink",
  "fuel",
  "riceCake",
  "gel",
  "banana",
  "oatBar",
] as const;

export type FuelItemId = (typeof FUEL_ITEM_IDS)[number];

export type FuelItem = {
  kind: "bottle" | "food";
  /** Carbohydrate in grams: per litre for a bottle, per piece for food. */
  carbs: number;
  /** Sodium in mg: per litre for a bottle, per piece for food. */
  sodiumMg: number;
  /** Fat and fibre slow the stomach; best early, not in a hard finale (Thomas 2016). */
  fatFibre: boolean;
  /** Cooked rice in a jersey pocket: eaten in the first hour or two (section 2.8). */
  perishable: boolean;
};

export const FUEL_ITEMS: Record<FuelItemId, FuelItem> = {
  water: { kind: "bottle", carbs: 0, sodiumMg: 0, fatFibre: false, perishable: false },
  /**
   * Recipe A without the sugar and juice: 1.5 g salt (about ¼ tsp) in a
   * litre of water gives 590 mg sodium. Kadence's reading of Team
   * Danmark's advice to lower the sugar and raise the salt in heat (2.3).
   */
  saltWater: { kind: "bottle", carbs: 0, sodiumMg: 590, fatFibre: false, perishable: false },
  /** Recipe A, about 6 %: 57.6–60 g and 590 mg sodium a litre. */
  drink: { kind: "bottle", carbs: 60, sodiumMg: 590, fatFibre: false, perishable: false },
  /** Recipe B1, about 8 %: 60.2 g in 750 ml, 629 mg sodium a litre. */
  fuel: { kind: "bottle", carbs: 80, sodiumMg: 629, fatFibre: false, perishable: false },
  /** Recipe C, sweet rice cakes without egg: 31–33 g and about 39 mg sodium each. */
  riceCake: { kind: "food", carbs: 32, sodiumMg: 39, fatFibre: false, perishable: true },
  /**
   * A bought gel: Maurten Gel 100 has 25 g, SiS GO 22 g (section 2.7).
   * Sodium differs between brands and is not counted.
   */
  gel: { kind: "food", carbs: 25, sodiumMg: 0, fatFibre: false, perishable: false },
  /** Team Danmark: two medium bananas (240 g) give 50 g (section 2.6). */
  banana: { kind: "food", carbs: 25, sodiumMg: 0, fatFibre: false, perishable: false },
  /** Recipe D, baked oat bars: 32–34 g each; 1 g salt in 8 bars is 49 mg each. */
  oatBar: { kind: "food", carbs: 33, sodiumMg: 49, fatFibre: true, perishable: false },
};

export type BottleMl = 500 | 750;

/** One item's carbohydrate, fluid and sodium, with bottles of `bottleMl`. */
export function itemContent(
  id: FuelItemId,
  bottleMl: BottleMl,
): { carbs: number; fluidL: number; sodiumMg: number } {
  const item = FUEL_ITEMS[id];
  if (item.kind === "food") return { carbs: item.carbs, fluidL: 0, sodiumMg: item.sodiumMg };
  const litres = bottleMl / 1000;
  return {
    carbs: Math.round(item.carbs * litres),
    fluidL: litres,
    sodiumMg: Math.round(item.sodiumMg * litres),
  };
}
