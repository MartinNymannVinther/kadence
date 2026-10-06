import { describe, expect, it } from "vitest";
import type { Features } from "@/core/features";
import { HUB_CALCULATORS, HUB_GUIDES, shownItems, shownTopics } from "@/modules/guides/hub";

/**
 * The open hub offers what waits for nothing, and a parked calculator or
 * guide only where the installation has turned it on (docs/adr/0056).
 */

const off: Features = {
  rulleWorld: false,
  coachesRoom: false,
  clubChampionship: false,
  energyCalculator: false,
  foodGuide: false,
};

describe("the open hub", () => {
  it("leaves out the energy calculator and the food guide while they are off", () => {
    expect(shownItems(HUB_CALCULATORS, off).map((i) => i.href)).toEqual(["/calculators/gearing"]);
    expect(shownItems(HUB_GUIDES, off).map((i) => i.href)).toEqual([
      "/guides/classes",
      "/guides/equipment",
    ]);
    expect(shownTopics(off)).toEqual(["classes", "equipment", "gearing"]);
  });

  it("brings each back on its own flag", () => {
    expect(shownTopics({ ...off, foodGuide: true })).toEqual([
      "classes",
      "equipment",
      "food",
      "gearing",
    ]);
    expect(shownTopics({ ...off, energyCalculator: true })).toEqual([
      "classes",
      "equipment",
      "energy",
      "gearing",
    ]);
  });
});
