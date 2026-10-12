import { describe, expect, it } from "vitest";
import {
  bestWindowAverage,
  cleanHeartRate,
  heartRateCeiling,
  heldMax,
  summarizeHeartRate,
  tanakaMaxHr,
  TWENTY_MINUTES_SAMPLES,
} from "@/modules/load/heart-rate-summary";

/**
 * A ride's pulse for the threshold proposal (docs/adr/0094): what a
 * strap's lies look like and that they are dropped before a max or a
 * 20-minute average is read.
 */

const steady = (bpm: number, samples: number) => Array.from({ length: samples }, () => bpm);

describe("cleaning the pulse", () => {
  it("drops a single spike that jumps more than 30 beats in five seconds", () => {
    expect(cleanHeartRate([150, 152, 240, 151, 153], 230)).toEqual([150, 152, null, 151, 153]);
    expect(cleanHeartRate([150, 152, 195, 151], 230)).toEqual([150, 152, null, 151]);
  });

  it("keeps a real climb of a few beats per sample", () => {
    const climb = [150, 160, 170, 178, 185, 190];
    expect(cleanHeartRate(climb, 230)).toEqual(climb);
  });

  it("drops what is outside 30 bpm and the ceiling", () => {
    expect(cleanHeartRate([20, 150, 240, null, "x", 151], 230)).toEqual([
      null,
      150,
      null,
      null,
      null,
      151,
    ]);
  });

  it("believes a new level after half a minute of it", () => {
    const out = cleanHeartRate([90, ...steady(160, 8)], 230);
    expect(out.slice(1, 7)).toEqual(steady(null as unknown as number, 6));
    expect(out.slice(7)).toEqual([160, 160]);
  });

  it("does not compare across a gap", () => {
    expect(cleanHeartRate([120, null, 170], 230)).toEqual([120, null, 170]);
  });
});

describe("a ride's max and 20 minutes", () => {
  it("takes a max held for two samples, never one", () => {
    expect(heldMax([170, 188, 175, 186, 187, 180])).toBe(186);
    expect(heldMax([170])).toBeNull();
  });

  it("averages the best 20 minutes and needs nine in ten samples read", () => {
    const ride = [...steady(140, 100), ...steady(175, TWENTY_MINUTES_SAMPLES), ...steady(150, 50)];
    expect(bestWindowAverage(ride)).toBeCloseTo(175);
    const gappy = ride.map((v, i) => (i % 5 === 0 ? null : v));
    expect(bestWindowAverage(gappy)).toBeNull();
    expect(bestWindowAverage(steady(170, 100))).toBeNull();
  });

  it("is null for a ride without a pulse", () => {
    expect(summarizeHeartRate(null)).toBeNull();
    expect(summarizeHeartRate([null, null])).toBeNull();
  });

  it("is not lifted by a spike", () => {
    const ride = [...steady(165, 300)];
    ride[150] = 228;
    expect(summarizeHeartRate(ride, 230)).toEqual({ best20Min: 165, heldMax: 165 });
  });
});

describe("the age line, only ever a bound", () => {
  it("is Tanaka's 208 − 0.7 × age with a wide margin on top", () => {
    expect(tanakaMaxHr(40)).toBe(180);
    expect(heartRateCeiling(16)).toBe(Math.round(208 - 0.7 * 16 + 30));
    expect(heartRateCeiling(5)).toBe(230);
  });
});
