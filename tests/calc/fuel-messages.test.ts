import { describe, expect, it } from "vitest";
import da from "../../messages/da.json";
import en from "../../messages/en.json";
import type { CarbState, FluidState, Mood, Note } from "@/modules/calc/fuel-check";
import { FUEL_ITEM_IDS } from "@/modules/calc/fuel-items";

/**
 * The plan builder reads its words by keys made at runtime — an item's
 * name, a mood, a state, a note — which tests/i18n cannot follow. This
 * holds every one of them to both catalogues.
 */
type Messages = { [key: string]: string | Messages };
const at = (root: unknown, path: string) =>
  path.split(".").reduce<unknown>((node, part) => (node as Messages | undefined)?.[part], root);

const MOODS: Array<Mood | "ready" | "podium" | "thirstyHot"> = [
  "good",
  "hungry",
  "empty",
  "thirsty",
  "thirstyHot",
  "stomach",
  "slosh",
  "ready",
  "podium",
];
const CARBS: CarbState[] = ["free", "under", "ok", "over", "gut"];
const FLUID: FluidState[] = ["under", "ok", "over", "flood"];
/** Notes the builder says in its own words; the rest borrow the calculator's warnings. */
const OWN_NOTES: Note[] = ["sodium", "fuelHeat", "riceCakeLate", "fatFibre", "cages", "pastFinish"];
const BORROWED = ["warnings.capped", "warnings.practise", "warnings.heat", "result.multiple"];

const keys = [
  ...FUEL_ITEM_IDS.flatMap((id) => [`builder.items.${id}.name`, `builder.items.${id}.note`]),
  ...MOODS.map((m) => `builder.scene.look.${m}`),
  ...CARBS.map((s) => `builder.lane.carbState.${s}`),
  ...FLUID.map((s) => `builder.lane.fluidState.${s}`),
  ...OWN_NOTES.map((n) => `builder.notes.${n}`),
  ...[
    "carbsUnder",
    "carbsOver",
    "gutUntrained",
    "gutTrained",
    "fluidUnder",
    "fluidOver",
    "flood",
  ].map((k) => `builder.feedback.${k}`),
  ...BORROWED,
  ...["1", "2", "3", "4", "5", "6"].map((p) => `about.points.${p}`),
].map((k) => `calculators.energy.${k}`);

describe("the plan builder's words", () => {
  it.each(keys)("%s is in Danish and English", (key) => {
    expect(typeof at(da, key)).toBe("string");
    expect(typeof at(en, key)).toBe("string");
  });

  it("uses none of TrainingPeaks' names and no exclamation marks", () => {
    const text = JSON.stringify(at(da, "calculators.energy"));
    expect(text).not.toMatch(/\b(TSS|CTL|ATL|TSB|NP|IF)\b/);
    expect(text).not.toContain("!");
  });
});
