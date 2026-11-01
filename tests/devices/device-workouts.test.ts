import { describe, expect, it } from "vitest";
import { toGarminWorkout } from "@/modules/devices/garmin-workout";
import { toWahooPlan } from "@/modules/devices/wahoo-plan";
import type { BikeStructure } from "@/modules/workouts/structure";

/**
 * A planned bike session as the providers take it: Wahoo's plan JSON and
 * Garmin's Training API workout, from the same structure and the rider's
 * FTP and threshold heart rate. Pure; no database, no network.
 */

describe("the workouts sent to a head unit", () => {
  const structure: BikeStructure = {
    kind: "bike",
    steps: [
      { kind: "step", intent: "warmup", seconds: 600, target: { kind: "zone", zone: 2 } },
      {
        kind: "repeat",
        times: 3,
        steps: [
          {
            kind: "step",
            intent: "work",
            seconds: 300,
            target: { kind: "ftp_pct", low: 95, high: 105 },
            cadenceLow: 90,
            cadenceHigh: 100,
          },
          {
            kind: "step",
            intent: "recover",
            seconds: 120,
            target: { kind: "hr_pct", low: 70, high: 80 },
          },
        ],
      },
      { kind: "step", intent: "cooldown", seconds: 300, target: { kind: "rpe", value: 2 } },
    ],
  };
  const rider = { ftp: 250, thresholdHr: 180 };

  it("is Wahoo's plan JSON with FTP in the header and fractions of it on the steps", () => {
    const plan = toWahooPlan(structure, rider, "Tærskel 3x5", "Hold kadencen høj");
    expect(plan.header).toEqual({
      name: "Tærskel 3x5",
      version: "1.0.0",
      description: "Hold kadencen høj",
      duration_s: 600 + 3 * 420 + 300,
      workout_type_family: 0,
      workout_type_location: 1,
      ftp: 250,
    });
    expect(plan.intervals[0]).toEqual({
      name: "Z2",
      exit_trigger_type: "time",
      exit_trigger_value: 600,
      intensity_type: "wu",
      targets: [{ type: "ftp", low: 0.56, high: 0.75 }],
    });
    expect(plan.intervals[1]).toMatchObject({
      exit_trigger_type: "repeat",
      exit_trigger_value: 2,
      intervals: [
        {
          exit_trigger_value: 300,
          intensity_type: "active",
          targets: [
            { type: "ftp", low: 0.95, high: 1.05 },
            { type: "rpm", low: 90, high: 100 },
          ],
        },
        { intensity_type: "recover", targets: [{ type: "hr", low: 126, high: 144 }] },
      ],
    });
    expect(plan.intervals[2]).toMatchObject({ targets: [{ type: "rpe", low: 2, high: 2 }] });
  });

  it("leaves power out of a Wahoo plan without an FTP, and names the zone instead", () => {
    const plan = toWahooPlan(structure, { ftp: null, thresholdHr: null }, "x");
    expect(plan.header.ftp).toBeUndefined();
    expect(plan.intervals[0]).toMatchObject({ name: "Z2", targets: [] });
  });

  it("is a Garmin workout in watts and beats, numbered through the repeat", () => {
    const workout = toGarminWorkout(structure, rider, "Tærskel 3x5");
    expect(workout).toMatchObject({ workoutName: "Tærskel 3x5", sport: "CYCLING" });
    const [steps] = workout.segments.map((segment) => segment.steps);
    expect(steps![0]).toMatchObject({
      type: "WorkoutStep",
      stepOrder: 1,
      intensity: "WARMUP",
      durationType: "TIME",
      durationValue: 600,
      targetType: "POWER",
      targetValueLow: 140,
      targetValueHigh: 188,
    });
    expect(steps![1]).toMatchObject({
      type: "WorkoutRepeatStep",
      stepOrder: 2,
      repeatType: "REPEAT_UNTIL_STEPS_CMPLT",
      repeatValue: 3,
      steps: [
        { stepOrder: 3, intensity: "INTERVAL", targetValueLow: 238, targetValueHigh: 263 },
        { stepOrder: 4, targetType: "HEART_RATE", targetValueLow: 126, targetValueHigh: 144 },
      ],
    });
    expect(steps![2]).toMatchObject({
      stepOrder: 5,
      targetType: "OPEN",
      description: "RPE 2",
    });
  });
});
