import { describe, expect, it } from "vitest";
import {
  airDensity,
  kcalFromHeartRate,
  kcalFromMet,
  kcalFromWork,
  powerFromSpeed,
  workKj,
} from "@/modules/calc/energy";
import {
  afterRace,
  allowedLossKg,
  beforeRace,
  carbsPerHour,
  coverage,
  fluidPerHour,
  fuelPlan,
  sodiumPerHour,
} from "@/modules/calc/fuel";

/**
 * The worked examples in docs/research/ernaering.md, sections 4.3 and
 * 4.11, worked out again by the code.
 */
describe("energy", () => {
  it("from power: 180 W for 3 hours is 1944 kJ, about 2020–2580 kcal", () => {
    const kj = workKj(180, 3 * 3600);
    expect(kj).toBe(1944);
    const kcal = kcalFromWork(kj);
    expect(kcal.low).toBeCloseTo(2020, -1);
    expect(kcal.high).toBeCloseTo(2581, -1);
  });

  it("from speed: a 38 km/h time trial on the flat is about 176 W", () => {
    expect(airDensity(15)).toBeCloseTo(1.225, 3);
    const watts = powerFromSpeed({
      kmh: 38,
      totalKg: 68,
      climbM: 0,
      seconds: 2400,
      position: "timeTrial",
      celsius: 20,
    });
    expect(watts).toBeCloseTo(176, 0);
  });

  it("climbing adds its share of the race", () => {
    const flat = { kmh: 30, totalKg: 70, seconds: 3600, position: "hoods" as const, celsius: 15 };
    const hilly = powerFromSpeed({ ...flat, climbM: 500 });
    expect(hilly - powerFromSpeed({ ...flat, climbM: 0 })).toBeCloseTo(
      (70 * 9.81 * 500) / 3600 / 0.976,
      5,
    );
  });

  it("from heart rate: Keytel's examples for a boy and a girl", () => {
    const base = { bpm: 160, kg: 60, age: 17, minutes: 120 };
    expect(kcalFromHeartRate({ ...base, sex: "male" })).toBeCloseTo(1755, -1);
    expect(kcalFromHeartRate({ ...base, sex: "female" })).toBeCloseTo(1286, -1);
  });

  it("from MET: racing in general is 12 kcal per kg per hour", () => {
    expect(kcalFromMet("racing", 60, 2)).toBe(1440);
  });
});

describe("carbohydrate per hour", () => {
  it("follows the race's length", () => {
    expect(carbsPerHour(0.5, true).kind).toBe("water");
    expect(carbsPerHour(1, true).kind).toBe("small");
    expect(carbsPerHour(2, true)).toMatchObject({ low: 30, high: 60, target: 45, kind: "single" });
    expect(carbsPerHour(3, true)).toMatchObject({
      low: 60,
      high: 90,
      target: 75,
      kind: "multiple",
    });
  });

  it("stops at 60 g an hour without practice in training", () => {
    expect(carbsPerHour(3, false)).toMatchObject({
      low: 60,
      high: 60,
      kind: "single",
      capped: true,
    });
    expect(carbsPerHour(2, false)).toMatchObject({ high: 60, capped: false });
  });

  it("never suggests more than 90 g an hour", () => {
    for (const h of [3, 4, 5, 6]) expect(carbsPerHour(h, true).high).toBeLessThanOrEqual(90);
  });
});

describe("fluid and salt", () => {
  it("drinks more in the heat", () => {
    expect(fluidPerHour(18)).toEqual({ low: 0.4, high: 0.8 });
    expect(fluidPerHour(28)).toEqual({ low: 0.8, high: 1.2 });
  });

  it("allows 2 % of body weight lost below 25 °C and 1 % above 30 °C", () => {
    expect(allowedLossKg(60, 18)).toBeCloseTo(1.2, 5);
    expect(allowedLossKg(60, 32)).toBeCloseTo(0.6, 5);
    expect(allowedLossKg(60, 27.5)).toBeCloseTo(0.9, 5);
  });

  it("puts 500–700 mg of sodium in each litre", () => {
    expect(sodiumPerHour({ low: 0.4, high: 0.8 })).toEqual({ low: 200, high: 560 });
  });
});

describe("the plan", () => {
  it("the worked example: three bottles of 6 % and three rice cakes", () => {
    const plan = fuelPlan({
      hours: 3,
      carbsPerHour: 75,
      fluidPerHour: 0.6,
      bottleLitres: 0.75,
      mixGramsPerLitre: 60,
      gramsPerPiece: 32,
    });
    expect(plan).toMatchObject({ bottles: 3, carbsTotal: 225, carbsFromBottles: 135, pieces: 3 });
  });

  it("water only leaves all the carbohydrate to the pieces", () => {
    const plan = fuelPlan({
      hours: 2,
      carbsPerHour: 45,
      fluidPerHour: 0.5,
      bottleLitres: 0.5,
      mixGramsPerLitre: 0,
      gramsPerPiece: 25,
    });
    expect(plan).toMatchObject({ bottles: 2, carbsFromBottles: 0, pieces: 4 });
  });

  it("before and after scale with the rider's weight", () => {
    expect(beforeRace(60, 3)).toEqual({ carbs: 180, fluidMl: { low: 300, high: 600 } });
    expect(beforeRace(60, 9).carbs).toBe(240);
    const after = afterRace(60);
    expect(after.carbs).toEqual({ low: 60, high: 72 });
    expect(after.protein.low).toBeCloseTo(15, 5);
    expect(after.protein.high).toBeCloseTo(18, 5);
  });

  it("coverage is a share of the hour's energy, or nothing", () => {
    const share = coverage(75, { low: 673, high: 861 });
    expect(share!.low).toBeCloseTo(0.35, 2);
    expect(share!.high).toBeCloseTo(0.45, 2);
    expect(coverage(0, { low: 600, high: 800 })).toBeNull();
  });
});
