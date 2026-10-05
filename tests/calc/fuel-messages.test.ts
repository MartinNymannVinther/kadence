import { describe, expect, it } from "vitest";
import da from "../../messages/da.json";
import en from "../../messages/en.json";
import { MAIN_MEAL, RECOVERY, REFUEL, SNACK } from "@/modules/calc/fuel-examples";
import { MEAL_ITEM_IDS, RIDE_ITEM_IDS } from "@/modules/calc/fuel-items";

/**
 * The energy advice reads many of its words by keys made at runtime — an
 * example's name, a food, a note, what comes next — which tests/i18n
 * cannot follow. This holds every one of them to both catalogues.
 */
type Messages = { [key: string]: string | Messages };
const at = (root: unknown, path: string) =>
  path.split(".").reduce<unknown>((node, part) => (node as Messages | undefined)?.[part], root);

const keys = [
  ...[...RIDE_ITEM_IDS, ...MEAL_ITEM_IDS].map((id) => `items.${id}.name`),
  ...[...MAIN_MEAL, ...SNACK, ...RECOVERY, ...REFUEL].flatMap((e) => [
    `examples.${e.id}.name`,
    `examples.${e.id}.amount`,
  ]),
  ...["capped", "multiple", "practise", "heat", "cages", "products"].map((w) => `warnings.${w}`),
  ...["rest", "hard", "soon"].flatMap((n) => [`setup.next.${n}.title`, `setup.next.${n}.body`]),
  ...["easy", "tempo", "intervals"].map((i) => `setup.intensity.${i}`),
  ...["female", "male"].flatMap((s) => [`setup.rider.${s}`, `setup.sex.${s}`]),
  ...["elite", "everyday"].flatMap((p) => [`plate.${p}.title`, `plate.${p}.body`]),
  ...["carbs", "protein", "greens"].map((p) => `plate.parts.${p}`),
  ...["pasta", "rice", "potatoes"].flatMap((d) => [`dayBefore.dinners.${d}`, `after.dinners.${d}`]),
  ...["titleRace", "titleTraining"].map((k) => `during.${k}`),
  ...["1", "2", "3", "4", "5", "6"].map((p) => `about.points.${p}`),
].map((k) => `calculators.energy.${k}`);

describe("the energy advice's words", () => {
  it.each(keys)("%s is in Danish and English", (key) => {
    expect(typeof at(da, key)).toBe("string");
    expect(typeof at(en, key)).toBe("string");
  });

  it("asks for no weight, names no gel, and uses no TrainingPeaks terms or exclamation marks", () => {
    const text = JSON.stringify(at(da, "calculators.energy"));
    expect(text).not.toMatch(/\b(TSS|CTL|ATL|TSB|NP|IF)\b/);
    expect(text).not.toContain("!");
    expect(text).not.toContain("Vægt (valgfri)");
    expect(at(da, "calculators.energy.items.gel")).toBeUndefined();
  });

  it("says hard training, not just hard, for what comes next", () => {
    expect(at(da, "calculators.energy.setup.next.hard.title")).toBe(
      "Hård træning eller løb i morgen",
    );
    expect(at(da, "calculators.energy.setup.next.soon.title")).toBe(
      "Hård træning eller løb inden for 8 timer",
    );
  });
});
