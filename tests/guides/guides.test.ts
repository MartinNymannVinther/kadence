import { describe, expect, it } from "vitest";
import da from "../../messages/da.json";
import en from "../../messages/en.json";
import { GEAR_PRODUCTS } from "@/modules/calc/gear-products";
import { GEAR_CLASSES, YOUTH_GEARING } from "@/modules/dcu/gearing";
import { RACE_RULES } from "@/modules/dcu/races";
import { VALUE_ROWS } from "@/modules/guides/equipment-value";
import { GUIDES, guideNumbers, RECIPES } from "@/modules/guides/guides";
import { GUIDE_SOURCES } from "@/modules/guides/sources";

/**
 * The open guides hold together the way the coach guide does: every
 * section has its words in both languages, exactly as many points as it
 * says, real sources, and the numbers in its words come from the modules
 * that own them. The guides and calculators build their keys at runtime,
 * which the catalogue scan in tests/i18n cannot follow, so this test
 * walks them instead.
 */

type Section = { title: string; intro: string; points: Record<string, string> };
type Catalogue = {
  guides: Record<string, { sections: Record<string, Section> }> & {
    equipment: { value: { rows: Record<string, string>; bunch: Record<string, string> } };
    food: { recipes: { items: Record<string, Record<string, unknown>> } };
  };
  calculators: {
    gearing: { classes: Record<string, string>; products: { items: Record<string, string> } };
  };
};

for (const [lang, messages] of [
  ["da", da],
  ["en", en],
] as const) {
  const catalogue = messages as unknown as Catalogue;

  describe(`the open guides in ${lang}`, () => {
    for (const [id, sections] of Object.entries(GUIDES)) {
      it(`${id}: every section's words, point for point`, () => {
        const words = catalogue.guides[id]!.sections;
        expect(Object.keys(words).sort()).toEqual(sections.map((s) => s.id).sort());
        for (const section of sections) {
          const w = words[section.id]!;
          expect(w.title.length).toBeGreaterThan(3);
          expect(w.intro.length).toBeGreaterThan(20);
          expect(Object.keys(w.points)).toHaveLength(section.points);
        }
      });
    }

    it("fills every placeholder in the guides from the modules' numbers", () => {
      const values = guideNumbers();
      for (const id of Object.keys(GUIDES)) {
        const text = JSON.stringify(catalogue.guides[id]!.sections);
        for (const [, name] of text.matchAll(/\{(\w+)(?:, number)?\}/g))
          expect(values).toHaveProperty(name!);
      }
    });

    it("has words for every row of the value table, every product and every class", () => {
      const value = catalogue.guides.equipment.value;
      for (const row of VALUE_ROWS) {
        expect(value.rows[row.id]).toBeTruthy();
        expect(value.bunch[row.inBunch]).toBeTruthy();
      }
      for (const product of GEAR_PRODUCTS)
        expect(catalogue.calculators.gearing.products.items[product.id]).toBeTruthy();
      for (const c of GEAR_CLASSES) expect(catalogue.calculators.gearing.classes[c]).toBeTruthy();
    });

    it("has every recipe's words, ingredient for ingredient", () => {
      const items = catalogue.guides.food.recipes.items;
      expect(Object.keys(items).sort()).toEqual(RECIPES.map((r) => r.id).sort());
      for (const recipe of RECIPES) {
        const words = items[recipe.id]!;
        for (const k of ["title", "method", "carbs", "price"]) expect(words[k]).toBeTruthy();
        expect(Object.keys(words.ingredients as object)).toHaveLength(recipe.ingredients);
      }
    });
  });
}

describe("the guides' sources and numbers", () => {
  it("cite real sources, over https, for every section", () => {
    for (const sections of Object.values(GUIDES))
      for (const section of sections) {
        expect(section.sources.length).toBeGreaterThan(0);
        for (const id of section.sources) expect(GUIDE_SOURCES[id].url).toMatch(/^https:\/\//);
      }
  });

  it("take the race numbers from DCU's rules, not from their own words", () => {
    expect(guideNumbers()).toMatchObject({
      u17Road: RACE_RULES.U17.roadMaxKm,
      u19wMax: RACE_RULES.U19.women.roadMaxKm,
      u17Gear: YOUTH_GEARING.U17.limitM,
      u15Gear: YOUTH_GEARING.U15.limitM,
    });
  });

  it("a section from the milieu's experience is marked as such", () => {
    const unwritten = GUIDES.classes.find((s) => s.id === "unwritten");
    expect(unwritten?.experience).toBe(true);
  });
});
