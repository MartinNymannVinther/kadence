import { describe, expect, it } from "vitest";
import { parseWorkoutText } from "@/modules/workouts/parse-text";
import { structureMinutes } from "@/modules/workouts/structure";

/** A coach's shorthand, read without a model. */

describe("reading a coach's shorthand", () => {
  it("reads warm-up, intervals with recovery and cool-down", () => {
    const s = parseWorkoutText("15 min opvarmning, 3x10 min Z4 / 5 min pause, 10 min nedkørsel")!;
    expect(s.steps).toHaveLength(3);
    expect(s.steps[0]).toMatchObject({
      intent: "warmup",
      seconds: 900,
      target: { kind: "zone", zone: 2 },
    });
    expect(s.steps[1]).toMatchObject({
      kind: "repeat",
      times: 3,
      steps: [
        { intent: "work", seconds: 600, target: { kind: "zone", zone: 4 } },
        { intent: "recover", seconds: 300, target: { kind: "zone", zone: 1 } },
      ],
    });
    expect(s.steps[2]).toMatchObject({ intent: "cooldown", seconds: 600 });
    expect(structureMinutes(s)).toBe(15 + 45 + 10);
  });

  it("reads hours, minutes marks and shares of FTP", () => {
    expect(parseWorkoutText("2 t Z2")!.steps[0]).toMatchObject({
      seconds: 7200,
      target: { zone: 2 },
    });
    expect(parseWorkoutText("1,5 t distance")!.steps[0]).toMatchObject({
      seconds: 5400,
      target: { kind: "zone", zone: 2 },
    });
    const vo2 = parseWorkoutText("4 x 4' 110-115% FTP med 3' pause")!.steps[0]!;
    expect(vo2).toMatchObject({
      kind: "repeat",
      times: 4,
      steps: [
        { seconds: 240, target: { kind: "ftp_pct", low: 110, high: 115 } },
        { seconds: 180, intent: "recover" },
      ],
    });
  });

  it("reads DCU's words and a pulse target", () => {
    expect(parseWorkoutText("3x10 min AT")!.steps[0]).toMatchObject({
      steps: [{ target: { kind: "zone", zone: 4 } }],
    });
    expect(parseWorkoutText("20 min tempo")!.steps[0]).toMatchObject({ target: { zone: 3 } });
    expect(parseWorkoutText("30 min 85-89% puls")!.steps[0]).toMatchObject({
      target: { kind: "hr_pct", low: 85, high: 89 },
    });
    expect(parseWorkoutText("6x30 s sprint og 4 min rolig")!.steps[0]).toMatchObject({
      times: 6,
      steps: [
        { seconds: 30, target: { zone: 7 } },
        { seconds: 240, intent: "recover" },
      ],
    });
  });

  it("does not read Danish 'at' as threshold", () => {
    expect(parseWorkoutText("60 min rolig for at restituere")!.steps[0]).toMatchObject({
      target: { zone: 1 },
    });
  });

  it("gives up rather than guessing", () => {
    expect(parseWorkoutText("")).toBeNull();
    expect(parseWorkoutText("kør godt i dag")).toBeNull();
    expect(parseWorkoutText("3x ukendt")).toBeNull();
  });
});
