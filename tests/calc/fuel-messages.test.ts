import { describe, expect, it } from "vitest";
import da from "../../messages/da.json";
import en from "../../messages/en.json";
import type { CarbState, FluidState, Note } from "@/modules/calc/fuel-check";
import { MEAL_ITEM_IDS, RIDE_ITEM_IDS } from "@/modules/calc/fuel-items";

/**
 * The energy calculator reads many of its words by keys made at runtime —
 * an item's name, a state, a note, a line of feedback, what comes next —
 * which tests/i18n cannot follow. This holds every one of them to both
 * catalogues.
 */
type Messages = { [key: string]: string | Messages };
const at = (root: unknown, path: string) =>
  path.split(".").reduce<unknown>((node, part) => (node as Messages | undefined)?.[part], root);

const CARBS: CarbState[] = ["free", "under", "ok", "over", "gut"];
const FLUID: FluidState[] = ["under", "ok", "over", "flood"];
/** Notes said in the results' own words; the rest borrow the calculator's warnings. */
const OWN_NOTES: Note[] = ["sodium", "fuelHeat", "riceCakeLate", "fatFibre", "cages", "pastFinish"];
const WARNINGS = ["capped", "practise", "heat", "multiple", "heartRateAge", "speedSolo"];
const LINES = [
  "gutUntrained",
  "gutTrained",
  "carbsUnder",
  "carbsEmpty",
  "carbsOver",
  "flood",
  "fluidUnder",
  "fluidOver",
];
const MEAL_LINES = [
  ...["carbs", "fluid"].flatMap((m) => ["under", "over"].map((s) => `before.${m}.${s}`)),
  ...["carbs", "protein", "fluid"].flatMap((m) => ["under", "over"].map((s) => `after.${m}.${s}`)),
];

const keys = [
  ...[...RIDE_ITEM_IDS, ...MEAL_ITEM_IDS].map((id) => `items.${id}.name`),
  ...CARBS.map((s) => `lane.carbState.${s}`),
  ...FLUID.map((s) => `lane.fluidState.${s}`),
  ...["ok", "under", "over"].map((s) => `meter.state.${s}`),
  ...OWN_NOTES.map((n) => `results.notes.${n}`),
  ...WARNINGS.map((w) => `warnings.${w}`),
  ...[...LINES, ...MEAL_LINES].map((l) => `lines.${l}`),
  ...["rest", "hard", "soon"].flatMap((n) => [
    `setup.next.${n}.title`,
    `setup.next.${n}.body`,
    `after.intro.${n}`,
  ]),
  ...["easy", "tempo", "intervals"].map((i) => `setup.intensity.${i}`),
  ...["female", "male"].flatMap((s) => [`setup.rider.${s}`, `setup.sex.${s}`]),
  ...["elite", "everyday"].flatMap((p) => [`plate.${p}.title`, `plate.${p}.body`]),
  ...["carbs", "protein", "greens"].map((p) => `plate.parts.${p}`),
  "before.notes.beforeFibre",
  ...["1", "2", "3", "4", "5", "6", "7", "8"].map((p) => `about.points.${p}`),
].map((k) => `calculators.energy.${k}`);

describe("the energy calculator's words", () => {
  it.each(keys)("%s is in Danish and English", (key) => {
    expect(typeof at(da, key)).toBe("string");
    expect(typeof at(en, key)).toBe("string");
  });

  it("asks for no weight, uses none of TrainingPeaks' terms and no exclamation marks", () => {
    const text = JSON.stringify(at(da, "calculators.energy"));
    expect(text).not.toMatch(/\b(TSS|CTL|ATL|TSB|NP|IF)\b/);
    expect(text).not.toContain("!");
    expect(text).not.toContain("Vægt (valgfri)");
  });
});
