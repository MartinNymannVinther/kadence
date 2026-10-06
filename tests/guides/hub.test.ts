import { describe, expect, it } from "vitest";
import type { Features } from "@/core/features";
import { HUB_CALCULATORS, HUB_GUIDES, shownItems, shownTopics } from "@/modules/guides/hub";

/**
 * The open hub offers what waits for nothing, and a parked calculator or
 * guide only where the installation has turned it on (docs/adr/0057).
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
      "/guides/programs",
    ]);
    expect(shownTopics(off)).toEqual(["classes", "equipment", "programs", "gearing"]);
  });

  it("brings each back on its own flag", () => {
    expect(shownTopics({ ...off, foodGuide: true })).toEqual([
      "classes",
      "equipment",
      "food",
      "programs",
      "gearing",
    ]);
    expect(shownTopics({ ...off, energyCalculator: true })).toEqual([
      "classes",
      "equipment",
      "programs",
      "energy",
      "gearing",
    ]);
  });

  it("shows the programmes guide without waiting for any flag", () => {
    expect(shownItems(HUB_GUIDES, off).map((i) => i.key)).toContain("programs");
  });
});
