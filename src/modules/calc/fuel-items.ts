/**
 * The food in the calculator's examples: bottles and food for the bike,
 * and meals for before and after. Ordinary food and homemade drinks, as
 * Team Danmark's ATK advises for children and young people (ATK 2.0,
 * nutrition chapter 2025), with one exception Kadence makes on purpose: a
 * gel without caffeine in a race from U17 (`gelsFor`, fuel-day.ts).
 *
 * On the bike the numbers are docs/research/ernaering.md, section 2, where
 * each recipe and product has its source; homemade recipes are counted at
 * the middle of their range. The meals are the Danish Food Composition
 * Database, version 6.1, May 2026 (DTU Fødevareinstituttet,
 * doi 10.11583/DTU.32312844, CC BY 4.0), per 100 g with the database's
 * food id beside each; the portion is Team Danmark's where its list of
 * foods with 50 g carbohydrate gives one (ernaering.md 2.6), and Kadence's
 * own otherwise.
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

export const RIDE_ITEM_IDS = [
  "water",
  "saltWater",
  "drink",
  "fuel",
  "riceCake",
  "banana",
  "gel",
] as const;

export const MEAL_ITEM_IDS = [
  "oats",
  "milk",
  "whiteBread",
  "ryeBread",
  "pasta",
  "rice",
  "potatoes",
  "banana",
  "raisins",
  "juice",
  "honey",
  "skyr",
  "cocoaMilk",
  "chicken",
  "egg",
  "cheese",
] as const;

export type FuelItemId = (typeof RIDE_ITEM_IDS)[number] | (typeof MEAL_ITEM_IDS)[number];

export type FuelItem = {
  kind: "bottle" | "food";
  /** Grams per litre for a bottle, per portion for food. */
  carbs: number;
  protein: number;
  /** Mg per litre for a bottle, per portion for food. */
  sodiumMg: number;
  /** What a portion adds to the fluid; a bottle is its size. */
  fluidL: number;
  /** Fat or fibre slow the stomach: best well before the start, not in a hard finale (Thomas 2016; Team Danmark). */
  fatFibre: boolean;
  /** Cooked rice in a jersey pocket keeps an hour or two (ernaering.md 2.8). */
  perishable: boolean;
};

const bottle = (carbs: number, sodiumMg: number): FuelItem => ({
  kind: "bottle",
  carbs,
  protein: 0,
  sodiumMg,
  fluidL: 0,
  fatFibre: false,
  perishable: false,
});

const piece = (carbs: number, sodiumMg: number, extra: Partial<FuelItem> = {}): FuelItem => ({
  kind: "food",
  carbs,
  protein: 0,
  sodiumMg,
  fluidL: 0,
  fatFibre: false,
  perishable: false,
  ...extra,
});

/**
 * A portion from the food database's values per 100 g. Fibre from 6 g or
 * fat from 10 g in a portion marks it as one to eat well before the start
 * — Kadence's line for Team Danmark's "få kostfibre" and "lidt fedt".
 */
function portion(
  grams: number,
  per100: { carbs: number; protein: number; fibre: number; fat: number; sodiumMg: number },
  fluidL = 0,
): FuelItem {
  const of = (n: number) => Math.round((n * grams) / 100);
  return {
    kind: "food",
    carbs: of(per100.carbs),
    protein: of(per100.protein),
    sodiumMg: of(per100.sodiumMg),
    fluidL,
    fatFibre: (per100.fibre * grams) / 100 >= 6 || (per100.fat * grams) / 100 >= 10,
    perishable: false,
  };
}

export const FUEL_ITEMS: Record<FuelItemId, FuelItem> = {
  water: bottle(0, 0),
  /** Recipe A without the sugar and juice: 1.5 g salt (about ¼ tsp) a litre is 590 mg sodium (2.3). */
  saltWater: bottle(0, 590),
  /** Recipe A, about 6 %: 57.6–60 g and 590 mg sodium a litre. */
  drink: bottle(60, 590),
  /** Recipe B1, about 8 %: 60.2 g in 750 ml, 629 mg sodium a litre. */
  fuel: bottle(80, 629),
  /** Recipe C, sweet rice cakes without egg: 31–33 g and about 39 mg sodium each. */
  riceCake: piece(32, 39, { perishable: true }),
  /**
   * A standard energy gel without caffeine: 25 g carbohydrate, the model's
   * default (ernaering.md section 3, input 10; Maurten Gel 100 has 25 g,
   * SiS GO Isotonic 22 g, section 2.10). Its salt varies between brands
   * and is not counted.
   */
  gel: piece(25, 0),

  /** 2½ dl oats, 75 g (Team Danmark); food 59, Havregryn, uspec. */
  oats: portion(75, { carbs: 58.3, protein: 12.9, fibre: 9.9, fat: 6.9, sodiumMg: 1.6 }),
  /** 2½ dl semi-skimmed milk, 250 g; food 33, Letmælk. */
  milk: portion(250, { carbs: 4.6, protein: 3.5, fibre: 0, fat: 1.6, sodiumMg: 43 }, 0.25),
  /** 2 slices of bread, 100 g (Team Danmark); food 861, Franskbrød. */
  whiteBread: portion(100, { carbs: 48.5, protein: 8.8, fibre: 3.6, fat: 3.9, sodiumMg: 423.5 }),
  /** 2 slices of rye bread, 100 g; food 1670, Rugbrød, mørkt. */
  ryeBread: portion(100, { carbs: 37.1, protein: 5.3, fibre: 8.5, fat: 1.3, sodiumMg: 436.9 }),
  /** A plate of cooked pasta, 250 g; food 1296, Pasta, kogt. */
  pasta: portion(250, { carbs: 25.0, protein: 5.0, fibre: 2.0, fat: 0.4, sodiumMg: 2 }),
  /** 2½ dl cooked rice, 150 g (Team Danmark); food 1973, Ris, kogte. */
  rice: portion(150, { carbs: 37.9, protein: 3.5, fibre: 0.8, fat: 0.4, sodiumMg: 2 }),
  /** Boiled potatoes, 250 g; food 801, Kartoffel, kogt. */
  potatoes: portion(250, { carbs: 18.6, protein: 1.7, fibre: 1.4, fat: 0.1, sodiumMg: 5 }),
  /** One medium banana, 120 g (Team Danmark: two are 240 g); food 3, Banan, rå. */
  banana: portion(120, { carbs: 21.0, protein: 1.1, fibre: 1.6, fat: 0.2, sodiumMg: 0 }),
  /** 1 dl raisins, 60 g (Team Danmark); food 880, Rosin uden kerner. */
  raisins: portion(60, { carbs: 74.7, protein: 3.2, fibre: 3.6, fat: 1.6, sodiumMg: 9 }),
  /** 2 dl orange juice, 200 g; food 1863, Appelsinjuice. */
  juice: portion(200, { carbs: 9.8, protein: 0.7, fibre: 0.5, fat: 0, sodiumMg: 0.9 }, 0.2),
  /** A tablespoon of honey, 20 g; food 1176, Honning. */
  honey: portion(20, { carbs: 81.5, protein: 0.3, fibre: 0, fat: 0, sodiumMg: 11 }),
  /** A bowl of skyr, 150 g; food 1693, Skyr, 0.2 % fedt. */
  skyr: portion(150, { carbs: 6.0, protein: 11.0, fibre: 0, fat: 0.2, sodiumMg: 45 }),
  /** 2½ dl chocolate milk, 250 g; food 1205, Cacaomælk. */
  cocoaMilk: portion(250, { carbs: 9.3, protein: 3.7, fibre: 0.5, fat: 1.8, sodiumMg: 46.6 }, 0.25),
  /** 100 g cooked chicken breast; food 754, Kylling, bryst (filet), kogt. */
  chicken: portion(100, { carbs: 0.4, protein: 20.6, fibre: 0, fat: 3.2, sodiumMg: 1120 }),
  /** One egg, 55 g without the shell; food 1663, Æg, høne, frilands. */
  egg: portion(55, { carbs: 1.1, protein: 12.3, fibre: 0, fat: 9.3, sodiumMg: 139.9 }),
  /** Two slices of cheese, 40 g; food 1274, Ost, fast, 30+. */
  cheese: portion(40, { carbs: 1.0, protein: 28.7, fibre: 0, fat: 16.0, sodiumMg: 729 }),
};

export type BottleMl = 500 | 750;

export type Content = { carbs: number; protein: number; fluidL: number; sodiumMg: number };

/** One item's carbohydrate, protein, fluid and sodium, with bottles of `bottleMl`. */
export function itemContent(id: FuelItemId, bottleMl: BottleMl): Content {
  const item = FUEL_ITEMS[id];
  if (item.kind === "food")
    return {
      carbs: item.carbs,
      protein: item.protein,
      fluidL: item.fluidL,
      sodiumMg: item.sodiumMg,
    };
  const litres = bottleMl / 1000;
  return {
    carbs: Math.round(item.carbs * litres),
    protein: 0,
    fluidL: litres,
    sodiumMg: Math.round(item.sodiumMg * litres),
  };
}

/** Everything in a list of items together. */
export function contentOf(items: readonly FuelItemId[], bottleMl: BottleMl): Content {
  const sum: Content = { carbs: 0, protein: 0, fluidL: 0, sodiumMg: 0 };
  for (const id of items) {
    const c = itemContent(id, bottleMl);
    sum.carbs += c.carbs;
    sum.protein += c.protein;
    sum.fluidL += c.fluidL;
    sum.sodiumMg += c.sodiumMg;
  }
  return sum;
}
