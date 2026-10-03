import { describe, expect, it } from "vitest";
import { DEFAULT_RACE, raceFuel } from "@/modules/calc/race-fuel";

describe("the energy calculator's answer", () => {
  it("the worked example: U19, 60 kg, 3 hours at 180 W, 18 °C, gut trained", () => {
    const answer = raceFuel({
      ...DEFAULT_RACE,
      minutes: 180,
      watts: 180,
      weightKg: 60,
      gutTrained: true,
    });
    expect(answer.energy).toMatchObject({ kind: "estimate", workKj: 1944 });
    expect(answer.carbs).toMatchObject({ low: 60, high: 90, target: 75 });
    expect(answer.plan).toMatchObject({
      bottles: 3,
      carbsTotal: 225,
      carbsFromBottles: 135,
      pieces: 3,
    });
    expect(answer.allowedLossKg).toBeCloseTo(1.2, 5);
    expect(answer.before?.carbs).toBe(180);
    expect(answer.warnings).toContain("practise");
  });

  it("without weight it still plans the race, and leaves the meals out", () => {
    const answer = raceFuel({ ...DEFAULT_RACE, weightKg: null });
    expect(answer.energy.kind).toBe("estimate");
    expect(answer.plan.bottles).toBeGreaterThan(0);
    expect(answer.before).toBeNull();
    expect(answer.after).toBeNull();
    expect(answer.allowedLossKg).toBeNull();
  });

  it("the methods that need weight ask for it", () => {
    for (const method of ["speed", "heartRate", "met"] as const) {
      expect(raceFuel({ ...DEFAULT_RACE, method, weightKg: null }).energy.kind).toBe("needsWeight");
      expect(raceFuel({ ...DEFAULT_RACE, method, weightKg: 60 }).energy.kind).toBe("estimate");
    }
  });

  it("says when the heart-rate model is outside the ages it was built on", () => {
    const young = raceFuel({ ...DEFAULT_RACE, method: "heartRate", weightKg: 60, age: 16 });
    expect(young.warnings).toContain("heartRateAge");
    const adult = raceFuel({ ...DEFAULT_RACE, method: "heartRate", weightKg: 60, age: 19 });
    expect(adult.warnings).not.toContain("heartRateAge");
  });

  it("caps an untrained gut at 60 g an hour on a long race", () => {
    const answer = raceFuel({ ...DEFAULT_RACE, minutes: 200, gutTrained: false });
    expect(answer.carbs.high).toBe(60);
    expect(answer.warnings).toContain("capped");
  });

  it("a short race is water, with no carbohydrate in the bottles", () => {
    const answer = raceFuel({ ...DEFAULT_RACE, minutes: 40 });
    expect(answer.carbs.kind).toBe("water");
    expect(answer.plan).toMatchObject({ carbsTotal: 0, carbsFromBottles: 0, pieces: 0 });
  });

  it("heat is named", () => {
    expect(raceFuel({ ...DEFAULT_RACE, celsius: 28 }).warnings).toContain("heat");
  });
});
