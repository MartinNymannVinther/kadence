import { describe, expect, it } from "vitest";
import { decodeFit, FILE_TYPE, INTENSITY, SPORT, WKT_DURATION, WKT_TARGET } from "@/modules/fit";
import { toFitWorkout } from "@/modules/workouts/export";
import { mixed, threshold } from "./fixtures";

const createdAt = new Date(Date.UTC(2026, 8, 27, 12, 0, 0));

describe("a FIT workout", () => {
  const fit = decodeFit(toFitWorkout(threshold, {}, "Tærskel 3×10", createdAt), {
    strictCrc: true,
  });

  it("is a workout file for cycling with its name and number of steps", () => {
    expect(fit.crcOk).toBe(true);
    expect(fit.fileType).toBe(FILE_TYPE.workout);
    expect(fit.manufacturer).toBe(255);
    expect(fit.timeCreated).toBe(createdAt.getTime());
    expect(fit.workout).toEqual({
      name: "Tærskel 3×10",
      sport: SPORT.cycling,
      subSport: undefined,
      numValidSteps: 5,
    });
    expect(fit.workoutSteps).toHaveLength(5);
    expect(fit.workoutSteps.map((s) => s.messageIndex)).toEqual([0, 1, 2, 3, 4]);
  });

  it("writes each step's time in milliseconds and its zone as a band of FTP", () => {
    const [warmup, on, off, , cooldown] = fit.workoutSteps;
    expect(warmup).toMatchObject({
      durationType: WKT_DURATION.time,
      durationValue: 600_000,
      targetType: WKT_TARGET.power,
      targetValue: 0,
      customTargetLow: 56,
      customTargetHigh: 75,
      intensity: INTENSITY.warmup,
    });
    expect(on).toMatchObject({
      durationValue: 600_000,
      customTargetLow: 91,
      customTargetHigh: 105,
      intensity: INTENSITY.active,
    });
    expect(off).toMatchObject({
      durationValue: 300_000,
      customTargetLow: 0,
      customTargetHigh: 55,
      intensity: INTENSITY.rest,
    });
    expect(cooldown).toMatchObject({ durationValue: 600_000, intensity: INTENSITY.cooldown });
  });

  it("repeats the block from its first step, three times", () => {
    expect(fit.workoutSteps[3]).toMatchObject({
      durationType: WKT_DURATION.repeatUntilStepsCmplt,
      durationValue: 1,
      targetValue: 3,
    });
  });

  it("writes a pulse target in beats per minute when the threshold is known, else leaves it open", () => {
    const known = decodeFit(toFitWorkout(mixed, { thresholdHr: 180 }, "Mixed", createdAt));
    const [tempo, pulse, rpe, open] = known.workoutSteps;
    expect(tempo).toMatchObject({
      name: "Tempo & <cadence>",
      targetType: WKT_TARGET.power,
      customTargetLow: 70,
      customTargetHigh: 80,
    });
    // 81–89 % of 180 bpm is 146–160 bpm, written as bpm + 100
    expect(pulse).toMatchObject({
      targetType: WKT_TARGET.heartRate,
      targetValue: 0,
      customTargetLow: 246,
      customTargetHigh: 260,
    });
    expect(rpe).toMatchObject({ targetType: WKT_TARGET.open, customTargetLow: undefined });
    expect(open).toMatchObject({ targetType: WKT_TARGET.open, intensity: INTENSITY.cooldown });

    const unknown = decodeFit(toFitWorkout(mixed, { thresholdHr: null }, "Mixed", createdAt));
    expect(unknown.workoutSteps[1]).toMatchObject({ targetType: WKT_TARGET.open });
  });

  it("writes a repeat of one as its steps alone", () => {
    const once = decodeFit(
      toFitWorkout(
        {
          kind: "bike",
          steps: [
            {
              kind: "repeat",
              times: 1,
              steps: [
                { kind: "step", intent: "work", seconds: 60, target: { kind: "zone", zone: 5 } },
                { kind: "step", intent: "recover", seconds: 60, target: { kind: "zone", zone: 1 } },
              ],
            },
          ],
        },
        {},
        "Once",
      ),
    );
    expect(once.workoutSteps).toHaveLength(2);
    expect(once.workout?.numValidSteps).toBe(2);
  });
});
