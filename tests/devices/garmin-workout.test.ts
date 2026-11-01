import { describe, expect, it } from "vitest";
import {
  GARMIN_MAX_STEPS,
  garminStepCount,
  toGarminWorkout,
  type GarminRepeat,
  type GarminStep,
  type Thresholds,
} from "@/modules/devices/garmin-workout";
import type { BikeStructure, Step } from "@/modules/workouts/structure";

/**
 * A bike session as Garmin's Training API, version 2, takes it
 * (docs/adr/0114): one CYCLING segment, fixed watts from Kadence's own
 * FTP, heart rate when there is no FTP, cadence beside them or alone, and
 * open otherwise; repeats numbered through; and Garmin's step limit
 * counted the way Garmin counts it. Pure; no database, no network.
 */

const rider: Thresholds = { ftp: 250, thresholdHr: 180 };
const step = (s: Partial<Step> & Pick<Step, "target">): Step => ({
  kind: "step",
  intent: "steady",
  seconds: 300,
  ...s,
});
const one = (s: Step, thresholds = rider) =>
  toGarminWorkout({ kind: "bike", steps: [s] }, thresholds, "x").segments[0].steps[0] as GarminStep;

describe("a Garmin workout, version 2", () => {
  it("is one cycling segment, with Kadence as the provider and the session's words", () => {
    const workout = toGarminWorkout(
      { kind: "bike", steps: [step({ target: { kind: "zone", zone: 2 } })] },
      rider,
      "  Tempo  ",
      "Hold kadencen",
    );
    expect(workout).toMatchObject({
      workoutName: "Tempo",
      description: "Hold kadencen",
      sport: "CYCLING",
      workoutProvider: "Kadence",
      workoutSourceId: "Kadence",
      isSessionTransitionEnabled: false,
      segments: [{ segmentOrder: 1, sport: "CYCLING" }],
    });
    expect(workout.workoutProvider.length).toBeLessThanOrEqual(20);
    expect(workout).not.toHaveProperty("steps");
  });

  it("cuts the description to 1024 characters and a step's to 512, and names a nameless one", () => {
    const workout = toGarminWorkout(
      {
        kind: "bike",
        steps: [step({ target: { kind: "open" }, label: "x".repeat(80) })],
      },
      rider,
      "   ",
      "y".repeat(2000),
    );
    expect(workout.workoutName).toBe("Kadence");
    expect(workout.description).toHaveLength(1024);
    expect((workout.segments[0].steps[0] as GarminStep).description!.length).toBeLessThanOrEqual(
      512,
    );
  });

  it("holds a zone or a share of FTP in watts at the rider's FTP", () => {
    expect(one(step({ target: { kind: "zone", zone: 4 } }))).toMatchObject({
      targetType: "POWER",
      targetValueLow: 228,
      targetValueHigh: 263,
      targetValue: null,
      description: "Z4",
    });
    expect(one(step({ target: { kind: "ftp_pct", low: 105, high: 95 } }))).toMatchObject({
      targetType: "POWER",
      targetValueLow: 238,
      targetValueHigh: 263,
    });
  });

  it("falls back to heart rate for power without an FTP, zone for zone", () => {
    const noFtp = { ftp: null, thresholdHr: 180 };
    expect(one(step({ target: { kind: "zone", zone: 3 } }), noFtp)).toMatchObject({
      targetType: "HEART_RATE",
      targetValueLow: 162,
      targetValueHigh: 167,
      description: "Z3",
    });
    // 95-105 % of FTP is zone 4's band; zone 4's pulse is 94-99 % of threshold.
    expect(one(step({ target: { kind: "ftp_pct", low: 95, high: 105 } }), noFtp)).toMatchObject({
      targetType: "HEART_RATE",
      targetValueLow: 169,
      targetValueHigh: 178,
    });
  });

  it("holds a share of threshold heart rate in beats, and is open without a threshold", () => {
    expect(one(step({ target: { kind: "hr_pct", low: 80, high: 70 } }))).toMatchObject({
      targetType: "HEART_RATE",
      targetValueLow: 126,
      targetValueHigh: 144,
    });
    const nothing = { ftp: null, thresholdHr: null };
    expect(one(step({ target: { kind: "hr_pct", low: 70, high: 80 } }), nothing)).toMatchObject({
      targetType: "OPEN",
      targetValueLow: null,
      description: "70-80% HR",
    });
    expect(one(step({ target: { kind: "zone", zone: 2 } }), nothing)).toMatchObject({
      targetType: "OPEN",
      description: "Z2",
    });
  });

  it("is open for an RPE, with the RPE in words", () => {
    expect(one(step({ target: { kind: "rpe", value: 7 } }))).toMatchObject({
      targetType: "OPEN",
      description: "RPE 7",
      secondaryTargetType: null,
    });
  });

  it("puts a cadence range beside power or pulse, and makes it the target where there is nothing else", () => {
    expect(
      one(step({ target: { kind: "zone", zone: 3 }, cadenceLow: 100, cadenceHigh: 90 })),
    ).toMatchObject({
      targetType: "POWER",
      secondaryTargetType: "CADENCE",
      secondaryTargetValueLow: 90,
      secondaryTargetValueHigh: 100,
    });
    expect(one(step({ target: { kind: "rpe", value: 5 }, cadenceLow: 95 }))).toMatchObject({
      targetType: "CADENCE",
      targetValueLow: 95,
      targetValueHigh: 95,
      secondaryTargetType: null,
    });
    expect(one(step({ target: { kind: "zone", zone: 2 } }))).toMatchObject({
      secondaryTargetType: null,
      secondaryTargetValueLow: null,
    });
  });

  it("numbers steps through the repeats, and a repeat of one is just its steps", () => {
    const structure: BikeStructure = {
      kind: "bike",
      steps: [
        step({ intent: "warmup", target: { kind: "zone", zone: 2 } }),
        {
          kind: "repeat",
          times: 4,
          steps: [
            step({ intent: "work", target: { kind: "zone", zone: 5 } }),
            step({ intent: "recover", target: { kind: "zone", zone: 1 } }),
          ],
        },
        { kind: "repeat", times: 1, steps: [step({ target: { kind: "zone", zone: 3 } })] },
        step({ intent: "cooldown", target: { kind: "open" } }),
      ],
    };
    const steps = toGarminWorkout(structure, rider, "x").segments[0].steps;
    expect(steps.map((s) => [s.type, s.stepOrder])).toEqual([
      ["WorkoutStep", 1],
      ["WorkoutRepeatStep", 2],
      ["WorkoutStep", 5],
      ["WorkoutStep", 6],
    ]);
    const repeat = steps[1] as GarminRepeat;
    expect(repeat).toMatchObject({ repeatType: "REPEAT_UNTIL_STEPS_CMPLT", repeatValue: 4 });
    expect(repeat.steps.map((s) => [s.stepOrder, s.intensity])).toEqual([
      [3, "INTERVAL"],
      [4, "RECOVERY"],
    ]);
    expect(garminStepCount(structure)).toBe(6);
  });

  it("counts every step and every repeat, so a session past Garmin's limit can be told apart", () => {
    const repeat = (times: number) => ({
      kind: "repeat" as const,
      times,
      steps: Array.from({ length: 20 }, () => step({ target: { kind: "zone", zone: 2 } })),
    });
    const four = { kind: "bike" as const, steps: [1, 2, 3, 4].map(() => repeat(2)) };
    expect(garminStepCount(four)).toBe(84);
    const five = { kind: "bike" as const, steps: [1, 2, 3, 4, 5].map(() => repeat(2)) };
    expect(garminStepCount(five)).toBe(105);
    expect(GARMIN_MAX_STEPS).toBe(100);
    expect(garminStepCount(five)).toBeGreaterThan(GARMIN_MAX_STEPS);
  });

  it("gives the same JSON for the same session and thresholds, and other JSON for another FTP", () => {
    const structure: BikeStructure = {
      kind: "bike",
      steps: [step({ target: { kind: "zone", zone: 4 } })],
    };
    const a = JSON.stringify(toGarminWorkout(structure, rider, "x"));
    expect(JSON.stringify(toGarminWorkout(structure, rider, "x"))).toBe(a);
    expect(JSON.stringify(toGarminWorkout(structure, { ...rider, ftp: 260 }, "x"))).not.toBe(a);
  });
});
