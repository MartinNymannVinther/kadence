import { describe, expect, it } from "vitest";
import {
  afterSlots,
  beforeTargets,
  carbAdvice,
  DEFAULT_DAY,
  fluidAfter,
  plateFor,
  sweatPerHour,
  type Day,
} from "@/modules/calc/fuel-day";

const DAY: Day = { ...DEFAULT_DAY, riderClass: "U17", sex: "male" }; // 61.8 kg behind the scenes

describe("the goals of a day", () => {
  it("before: about 1 g/kg for each hour from the main meal, ½ g either way, and 5–10 ml/kg", () => {
    expect(beforeTargets(DAY).carbs).toEqual({ low: 155, high: 216 }); // 2.5–3.5 g/kg
    expect(beforeTargets({ ...DAY, mealHours: 4 }).carbs).toEqual({ low: 216, high: 247 }); // 3.5–4
    expect(beforeTargets({ ...DAY, mealHours: 2 }).carbs).toEqual({ low: 93, high: 155 });
    const fluid = beforeTargets(DAY).fluid;
    expect(fluid.low).toBeCloseTo(0.309, 3);
    expect(fluid.high).toBeCloseTo(0.618, 3);
  });

  it("after: 1–1.2 g/kg of carbohydrate and 0.25–0.3 g/kg of protein, four hours of it within 8 hours", () => {
    expect(afterSlots(DAY)).toEqual([
      {
        carbs: { low: 62, high: 74 },
        protein: { low: 15, high: 19 },
        fluid: { low: 0.5, high: 1 },
      },
    ]);
    const soon = afterSlots({ ...DAY, next: "soon" });
    expect(soon).toHaveLength(4);
    expect(soon[1]).toEqual({
      carbs: { low: 62, high: 74 },
      protein: null,
      fluid: { low: 0.5, high: 0.7 },
    });
  });

  it("an easy ride asks less carbohydrate than a race; tempo and intervals as a race", () => {
    const easy = { ...DAY, session: "training" as const, intensity: "easy" as const };
    expect(carbAdvice({ ...easy, minutes: 90 })).toMatchObject({ low: 0, high: 30 });
    expect(carbAdvice({ ...easy, minutes: 180 })).toMatchObject({ low: 30, high: 60 });
    expect(carbAdvice({ ...easy, minutes: 60 }).kind).toBe("small");
    expect(carbAdvice({ ...DAY, session: "training", intensity: "intervals" })).toEqual(
      carbAdvice(DAY),
    );
  });

  it("gives the Elite plate after 1½ hours hard or before a hard day, the Y-plate otherwise", () => {
    expect(plateFor(DAY)).toBe("elite");
    expect(plateFor({ ...DAY, minutes: 60 })).toBe("everyday");
    expect(plateFor({ ...DAY, minutes: 60, next: "hard" })).toBe("elite");
    expect(plateFor({ ...DAY, session: "training", intensity: "easy", minutes: 180 })).toBe(
      "everyday",
    );
  });

  it("counts the sweat not drunk back, and 125–150 % of it to drink after", () => {
    expect(sweatPerHour(18)).toEqual({ low: 0.7, high: 1.2 });
    expect(sweatPerHour(28)).toEqual({ low: 1.2, high: 2 });
    const { lossL, replaceL } = fluidAfter(DAY, 1);
    expect(lossL.low).toBeCloseTo(0.4, 5);
    expect(lossL.high).toBeCloseTo(1.4, 5);
    expect(replaceL.low).toBeCloseTo(0.5, 5);
    expect(replaceL.high).toBeCloseTo(2.1, 5);
    expect(fluidAfter(DAY, 5).lossL).toEqual({ low: 0, high: 0 });
  });
});
