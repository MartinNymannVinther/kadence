import { describe, expect, it } from "vitest";
import { rpeLoadPerHour } from "@/modules/load/calibration";
import {
  hrPctToFtpPct,
  plannedLoad,
  targetIntensity,
  zoneIntensity,
} from "@/modules/load/planned-load";
import type { BikeStructure, Step } from "@/modules/workouts/structure";

const hour = (target: Step["target"], intent: Step["intent"] = "steady"): BikeStructure => ({
  kind: "bike",
  steps: [{ kind: "step", intent, seconds: 3600, target }],
});

describe("a planned bike session", () => {
  it("sums its steps, repeats unrolled", () => {
    const intervals: BikeStructure = {
      kind: "bike",
      steps: [
        { kind: "step", intent: "warmup", seconds: 900, target: { kind: "zone", zone: 2 } },
        {
          kind: "repeat",
          times: 3,
          steps: [
            {
              kind: "step",
              intent: "work",
              seconds: 600,
              target: { kind: "ftp_pct", low: 91, high: 100 },
            },
            { kind: "step", intent: "recover", seconds: 300, target: { kind: "zone", zone: 1 } },
          ],
        },
        { kind: "step", intent: "cooldown", seconds: 600, target: { kind: "open" } },
      ],
    };
    // Warm-up 15 min at 0.655, 3 × 10 min at 0.955 and 5 min at 0.475,
    // cool-down 10 min at 0.65: 10.7 + 45.6 + 5.6 + 7.0.
    expect(plannedLoad(intervals)).toBe(69);
  });

  it("makes an hour at threshold 100 however threshold is written", () => {
    expect(plannedLoad(hour({ kind: "ftp_pct", low: 100, high: 100 }))).toBe(100);
    expect(plannedLoad(hour({ kind: "rpe", value: 8 }))).toBe(100);
    expect(plannedLoad(hour({ kind: "open" }, "work"))).toBe(100);
  });

  it("reads an open easy step at 0.65 and an open recovery at 0.5", () => {
    expect(plannedLoad(hour({ kind: "open" }, "steady"))).toBe(42);
    expect(targetIntensity({ kind: "open" }, "recover")).toBe(0.5);
  });

  it("reads a zone at the power it is ridden at (ZONE_FTP_RIDE)", () => {
    expect(zoneIntensity(1)).toBe(0.5);
    expect(zoneIntensity(2)).toBe(0.65);
    expect(zoneIntensity(4)).toBe(0.98);
    expect(zoneIntensity(7)).toBe(1.6);
  });

  it("moves a share of threshold heart rate onto the power scale zone by zone", () => {
    expect(hrPctToFtpPct(81)).toBe(56);
    expect(hrPctToFtpPct(94)).toBe(91);
    expect(hrPctToFtpPct(100)).toBe(106);
    expect(hrPctToFtpPct(97)).toBeCloseTo(98.5, 9);
    expect(hrPctToFtpPct(200)).toBe(250);
    expect(targetIntensity({ kind: "hr_pct", low: 94, high: 100 }, "work")).toBeCloseTo(0.985, 9);
  });

  it("falls back to the planned minutes of steady riding when it has no steps", () => {
    expect(plannedLoad({ kind: "bike", steps: [] })).toBe(0);
    expect(plannedLoad({ kind: "bike", steps: [] }, 120)).toBe(85);
  });
});

describe("a planned strength or other session", () => {
  it("counts strength as its minutes at RPE 6", () => {
    const strength = {
      kind: "strength" as const,
      warmup: "",
      exercises: [],
      progression: [],
      minutes: 60,
    };
    expect(plannedLoad(strength)).toBe(Math.round(rpeLoadPerHour(6)));
  });

  it("counts anything else as its minutes at RPE 5", () => {
    expect(plannedLoad({ kind: "other", text: "Run", minutes: 60 })).toBe(
      Math.round(rpeLoadPerHour(5)),
    );
    expect(plannedLoad({ kind: "other", text: "Run", minutes: 0 }, 30)).toBe(
      Math.round(rpeLoadPerHour(5) / 2),
    );
  });
});
