import {
  HEART_RATE_VALID_AGES,
  kcalFromHeartRate,
  kcalFromMet,
  kcalFromWork,
  powerFromSpeed,
  spread,
  workKj,
  type Position,
  type RaceKind,
  type Range,
  type Sex,
} from "./energy";
import {
  afterRace,
  allowedLossKg,
  beforeRace,
  carbsPerHour,
  coverage,
  fluidPerHour,
  fuelPlan,
  sodiumPerHour,
  type BottleMix,
  type CarbAdvice,
  type FuelPlan,
} from "./fuel";

/**
 * The energy calculator's whole answer from what the rider typed: the
 * page only shows it. Weight is optional; without it the methods that
 * need it say so, and the meals before and after are left out rather
 * than guessed. Nothing here is stored anywhere.
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

export type Method = "watts" | "speed" | "heartRate" | "met";

export type RaceInput = {
  minutes: number;
  celsius: number;
  method: Method;
  watts: number;
  kmh: number;
  climbM: number;
  position: Position;
  bikeKg: number;
  bpm: number;
  age: number;
  sex: Sex;
  raceKind: RaceKind;
  /** Null when the rider keeps it to themselves. */
  weightKg: number | null;
  gutTrained: boolean;
  bottleMl: 500 | 750;
  mix: BottleMix;
  gramsPerPiece: number;
  hoursBefore: number;
};

export type EnergyAnswer =
  | { kind: "estimate"; kcal: Range; workKj: number | null; watts: number | null }
  | { kind: "needsWeight" }
  | { kind: "none" };

export type RaceAnswer = {
  hours: number;
  energy: EnergyAnswer;
  carbs: CarbAdvice;
  fluid: Range;
  sodium: Range;
  plan: FuelPlan;
  coverage: Range | null;
  allowedLossKg: number | null;
  before: ReturnType<typeof beforeRace> | null;
  after: ReturnType<typeof afterRace> | null;
  warnings: Warning[];
};

export type Warning = "heartRateAge" | "speedSolo" | "heat" | "capped" | "practise";

function energyFor(input: RaceInput, seconds: number): EnergyAnswer {
  if (seconds <= 0) return { kind: "none" };
  const kg = input.weightKg;
  switch (input.method) {
    case "watts":
      if (input.watts <= 0) return { kind: "none" };
      return estimateFromPower(input.watts, seconds);
    case "speed": {
      if (kg === null) return { kind: "needsWeight" };
      if (input.kmh <= 0) return { kind: "none" };
      const watts = powerFromSpeed({
        kmh: input.kmh,
        totalKg: kg + input.bikeKg,
        climbM: input.climbM,
        seconds,
        position: input.position,
        celsius: input.celsius,
      });
      return estimateFromPower(watts, seconds);
    }
    case "heartRate":
      if (kg === null) return { kind: "needsWeight" };
      if (input.bpm <= 0) return { kind: "none" };
      return {
        kind: "estimate",
        kcal: spread(
          kcalFromHeartRate({
            bpm: input.bpm,
            kg,
            age: input.age,
            sex: input.sex,
            minutes: seconds / 60,
          }),
        ),
        workKj: null,
        watts: null,
      };
    case "met":
      if (kg === null) return { kind: "needsWeight" };
      return {
        kind: "estimate",
        kcal: spread(kcalFromMet(input.raceKind, kg, seconds / 3600)),
        workKj: null,
        watts: null,
      };
  }
}

function estimateFromPower(watts: number, seconds: number): EnergyAnswer {
  const kj = workKj(watts, seconds);
  return { kind: "estimate", kcal: kcalFromWork(kj), workKj: kj, watts };
}

export function raceFuel(input: RaceInput): RaceAnswer {
  const hours = Math.max(0, input.minutes) / 60;
  const energy = energyFor(input, hours * 3600);
  const carbs = carbsPerHour(hours, input.gutTrained);
  const fluid = fluidPerHour(input.celsius);
  const plan = fuelPlan({
    hours,
    carbsPerHour: carbs.target,
    fluidPerHour: (fluid.low + fluid.high) / 2,
    bottleLitres: input.bottleMl / 1000,
    mixGramsPerLitre: carbs.target > 0 ? input.mix : 0,
    gramsPerPiece: input.gramsPerPiece,
  });
  const kg = input.weightKg;
  const perHour =
    energy.kind === "estimate" && hours > 0
      ? { low: energy.kcal.low / hours, high: energy.kcal.high / hours }
      : null;

  const warnings: Warning[] = [];
  if (
    input.method === "heartRate" &&
    (input.age < HEART_RATE_VALID_AGES.low || input.age > HEART_RATE_VALID_AGES.high)
  )
    warnings.push("heartRateAge");
  if (input.method === "speed") warnings.push("speedSolo");
  if (input.celsius >= 25) warnings.push("heat");
  if (carbs.capped) warnings.push("capped");
  if (carbs.high > 60) warnings.push("practise");

  return {
    hours,
    energy,
    carbs,
    fluid,
    sodium: sodiumPerHour(fluid),
    plan,
    coverage: perHour ? coverage(carbs.target, perHour) : null,
    allowedLossKg: kg === null ? null : allowedLossKg(kg, input.celsius),
    before: kg === null ? null : beforeRace(kg, input.hoursBefore),
    after: kg === null ? null : afterRace(kg),
    warnings,
  };
}

export const DEFAULT_RACE: RaceInput = {
  minutes: 120,
  celsius: 18,
  method: "watts",
  watts: 180,
  kmh: 38,
  climbM: 0,
  position: "drops",
  bikeKg: 8,
  bpm: 155,
  age: 17,
  sex: "male",
  raceKind: "racing",
  weightKg: null,
  gutTrained: false,
  bottleMl: 750,
  mix: 60,
  gramsPerPiece: 32,
  hoursBefore: 3,
};
