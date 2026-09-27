import { describe, expect, it } from "vitest";
import { activityLoad } from "@/modules/load/activity-load";
import { rpeIntensity, rpeLoad, rpeLoadPerHour, sessionRpe } from "@/modules/load/calibration";

const hourAt = (watts: number) => Array.from({ length: 3600 }, () => watts);

describe("load by power", () => {
  it("makes an hour at FTP 100", () => {
    const result = activityLoad(
      { sport: "bike", seconds: 3600, power1hz: hourAt(250) },
      { ftp: 250 },
    );
    expect(result).toEqual({ load: 100, method: "power", intensity: 1 });
  });

  it("uses the device's weighted power when there is no stream", () => {
    const result = activityLoad(
      { sport: "bike", seconds: 7200, weightedPower: 200 },
      { ftp: 250, thresholdHr: 180 },
    );
    // 2 h × 0.8² × 100
    expect(result).toEqual({ load: 128, method: "power", intensity: 0.8 });
  });

  it("carries the raw session RPE along when one was given", () => {
    const result = activityLoad(
      { sport: "bike", seconds: 3600, weightedPower: 250, rpe: 7 },
      { ftp: 250 },
    );
    expect(result.method).toBe("power");
    expect(result.srpe).toBe(420);
  });
});

describe("load by heart rate", () => {
  it("is used when there is no FTP", () => {
    const result = activityLoad({ sport: "bike", seconds: 3600, avgHr: 162 }, { thresholdHr: 180 });
    // 1 h × 0.9² × 100
    expect(result).toEqual({ load: 81, method: "hr", intensity: 0.9 });
  });

  it("caps an average far above threshold", () => {
    const result = activityLoad({ sport: "bike", seconds: 3600, avgHr: 200 }, { thresholdHr: 180 });
    expect(result.intensity).toBe(1.05);
    expect(result.load).toBe(110);
  });

  it("skips a strap that lost contact and falls back to RPE", () => {
    const result = activityLoad(
      { sport: "bike", seconds: 3600, avgHr: 60, rpe: 8 },
      { thresholdHr: 180 },
    );
    expect(result.method).toBe("rpe");
  });

  it("is used for another sport, where power is not", () => {
    const result = activityLoad(
      { sport: "other", seconds: 3600, weightedPower: 250, avgHr: 153 },
      { ftp: 250, thresholdHr: 180 },
    );
    expect(result.method).toBe("hr");
  });
});

describe("load by session RPE", () => {
  it("makes an hour at RPE 8 100, the same as an hour at threshold", () => {
    expect(rpeLoadPerHour(8)).toBe(100);
    const result = activityLoad({ sport: "bike", seconds: 3600, rpe: 8 }, {});
    expect(result).toEqual({ load: 100, method: "rpe", srpe: 480 });
  });

  it("makes an easy hour at RPE 3 between 15 and 20", () => {
    const result = activityLoad({ sport: "bike", seconds: 3600, rpe: 3 }, {});
    expect(result.load).toBeGreaterThanOrEqual(15);
    expect(result.load).toBeLessThanOrEqual(20);
    expect(result.srpe).toBe(180);
  });

  it("rises with every step of RPE", () => {
    const perHour = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rpeLoadPerHour);
    for (let i = 1; i < perHour.length; i++) expect(perHour[i]).toBeGreaterThan(perHour[i - 1]!);
    expect(Math.round(perHour[9]!)).toBe(149);
  });

  it("scales with minutes and reads as an intensity on the same scale", () => {
    expect(rpeLoad(90, 8)).toBeCloseTo(150, 9);
    expect(rpeIntensity(8)).toBe(1);
    expect(rpeIntensity(4)).toBeCloseTo(0.5 ** 0.9, 9);
  });

  it("keeps the raw minutes × RPE", () => {
    expect(sessionRpe(45, 6)).toBe(270);
  });

  it("is the only method for strength", () => {
    const result = activityLoad(
      { sport: "strength", seconds: 3600, weightedPower: 250, avgHr: 170, rpe: 6 },
      { ftp: 250, thresholdHr: 180 },
    );
    expect(result.method).toBe("rpe");
    expect(result.load).toBe(Math.round(rpeLoadPerHour(6)));
  });
});

describe("no load", () => {
  it("is none when there is nothing to go on", () => {
    expect(activityLoad({ sport: "bike", seconds: 3600 }, { ftp: 250, thresholdHr: 180 })).toEqual({
      load: 0,
      method: "none",
    });
  });

  it("is none for a strength session without an RPE", () => {
    expect(
      activityLoad({ sport: "strength", seconds: 3600, avgHr: 150 }, { thresholdHr: 180 }).method,
    ).toBe("none");
  });
});
