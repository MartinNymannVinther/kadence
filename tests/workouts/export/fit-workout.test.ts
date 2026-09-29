import { describe, expect, it } from "vitest";
import { decodeFit, FILE_TYPE, INTENSITY, SPORT, WKT_DURATION, WKT_TARGET } from "@/modules/fit";
import { toFitWorkout, versionSerial } from "@/modules/workouts/export";
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

describe("a FIT workout on a bike computer (ADR 0031)", () => {
  const onDevice = decodeFit(
    toFitWorkout(threshold, {}, "29.09 Tærskel 3×10", createdAt, {
      serial: versionSerial("ses_1", 1_000),
      description: "Hold kadencen høj i blokkene.",
    }),
    { strictCrc: true },
  );

  it("is this version of the session: a serial of its own, never none", () => {
    expect(onDevice.crcOk).toBe(true);
    expect(onDevice.serialNumber).toBe(versionSerial("ses_1", 1_000));
    expect(versionSerial("ses_1", 1_000)).not.toBe(versionSerial("ses_1", 2_000));
    expect(versionSerial("ses_1", 1_000)).not.toBe(versionSerial("ses_2", 1_000));
    for (let version = 0; version < 500; version++)
      expect(versionSerial("s", version)).toBeGreaterThan(0);
    // Without a version the field says none, as before.
    expect(decodeFit(toFitWorkout(threshold, {}, "x", createdAt)).serialNumber).toBeUndefined();
  });

  it("carries the session's description, and none when there is none", () => {
    expect(onDevice.workout?.description).toBe("Hold kadencen høj i blokkene.");
    expect(onDevice.workout?.name).toBe("29.09 Tærskel 3×10");
    const bare = decodeFit(toFitWorkout(threshold, {}, "x", createdAt, { description: "  " }));
    expect(bare.workout?.description).toBeUndefined();
  });

  it("names every step: the coach's label, or else its target in short", () => {
    expect(onDevice.workoutSteps.map((s) => s.name)).toEqual(["Z2", "Z4", "Z1", undefined, "Z1"]);
    const steps = decodeFit(
      toFitWorkout(mixed, { thresholdHr: null }, "Mixed", createdAt),
    ).workoutSteps;
    expect(steps.map((s) => s.name)).toEqual([
      "Tempo & <cadence>",
      "81-89% LTHR",
      "RPE 9",
      undefined,
    ]);
  });

  it("says in the notes what the device cannot hold: how hard, and a pulse without a threshold", () => {
    const unknown = decodeFit(toFitWorkout(mixed, { thresholdHr: null }, "Mixed", createdAt));
    expect(unknown.workoutSteps.map((s) => s.notes)).toEqual([
      undefined,
      "81-89% LTHR",
      "RPE 9/10",
      undefined,
    ]);
    const known = decodeFit(toFitWorkout(mixed, { thresholdHr: 180 }, "Mixed", createdAt));
    expect(known.workoutSteps[1]!.notes).toBeUndefined();
  });

  it("rides a cadence range beside power, and makes it the target where there is nothing else", () => {
    const [, on, off] = onDevice.workoutSteps;
    expect(on).toMatchObject({
      targetType: WKT_TARGET.power,
      secondaryTargetType: WKT_TARGET.cadence,
      secondaryTargetValue: 0,
      secondaryCustomTargetLow: 85,
      secondaryCustomTargetHigh: 95,
    });
    expect(off!.secondaryTargetType).toBeUndefined();

    const spin = decodeFit(
      toFitWorkout(
        {
          kind: "bike",
          steps: [
            {
              kind: "step",
              intent: "work",
              seconds: 120,
              target: { kind: "rpe", value: 6 },
              cadenceLow: 110,
            },
          ],
        },
        {},
        "Spin",
        createdAt,
      ),
    ).workoutSteps[0];
    expect(spin).toMatchObject({
      targetType: WKT_TARGET.cadence,
      targetValue: 0,
      customTargetLow: 110,
      customTargetHigh: 110,
      notes: "RPE 6/10",
    });
  });
});
