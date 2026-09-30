import { describe, expect, it } from "vitest";
import { Pace } from "@/components/rulle/scene/pace";

/** Feeds `count` frames `seconds` apart; the pixel ratios it was told to change to. */
function run(pace: Pace, seconds: number, count: number): number[] {
  const steps: number[] = [];
  for (let k = 0; k < count; k++) {
    const ratio = pace.frame(seconds);
    if (ratio !== null) steps.push(ratio);
  }
  return steps;
}

describe("the pace the picture is drawn at", () => {
  it("leaves a device that keeps up alone", () => {
    const pace = new Pace(1.5, 0.75);
    expect(run(pace, 1 / 60, 5000)).toEqual([]);
    expect(run(pace, 1 / 120, 5000)).toEqual([]);
  });

  it("gives a device that falls behind fewer pixels, a step at a time, down to the floor", () => {
    const pace = new Pace(1.5, 0.75);
    // The warm-up, then two slow verdicts of 90 frames for each step.
    expect(run(pace, 1 / 30, 120 + 179)).toEqual([]);
    expect(run(pace, 1 / 30, 1)).toEqual([1.25]);
    expect(run(pace, 1 / 30, 180)).toEqual([1]);
    expect(run(pace, 1 / 30, 180)).toEqual([0.75]);
    expect(run(pace, 1 / 30, 5000)).toEqual([]);
  });

  it("does not step down for one slow moment", () => {
    const pace = new Pace(1.5, 0.75);
    run(pace, 1 / 60, 120);
    for (let k = 0; k < 20; k++) {
      expect(run(pace, 1 / 30, 90)).toEqual([]);
      expect(run(pace, 1 / 60, 90)).toEqual([]);
    }
  });

  it("does not count the start, nor a gap while the tab was hidden", () => {
    const pace = new Pace(1.5, 0.75);
    // A slow start while the landscape is built is not held against the device.
    expect(run(pace, 1 / 20, 120)).toEqual([]);
    expect(run(pace, 1 / 60, 90)).toEqual([]);
    expect(run(pace, 5, 1000)).toEqual([]);
    expect(run(pace, 0, 1000)).toEqual([]);
    expect(run(pace, 1 / 60, 1000)).toEqual([]);
  });

  it("never goes below where it started or the floor", () => {
    const pace = new Pace(0.75, 0.75);
    expect(run(pace, 1 / 20, 5000)).toEqual([]);
  });
});
