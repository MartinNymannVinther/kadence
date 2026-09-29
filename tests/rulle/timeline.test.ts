import { describe, expect, it } from "vitest";
import { blockAt, buildTimeline, ergWatts, standing } from "@/modules/rulle";
import type { BikeStructure } from "@/modules/workouts/structure";

const threshold: BikeStructure = {
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
          seconds: 480,
          target: { kind: "zone", zone: 4 },
          cadenceLow: 85,
          cadenceHigh: 95,
        },
        { kind: "step", intent: "recover", seconds: 120, target: { kind: "zone", zone: 1 } },
      ],
    },
    { kind: "step", intent: "work", seconds: 30, target: { kind: "open" } },
    {
      kind: "step",
      intent: "steady",
      seconds: 300,
      target: { kind: "ftp_pct", low: 95, high: 95 },
    },
    { kind: "step", intent: "cooldown", seconds: 300, target: { kind: "rpe", value: 2 } },
    { kind: "step", intent: "steady", seconds: 60, target: { kind: "hr_pct", low: 85, high: 88 } },
  ],
};

const rider = { ftp: 250, thresholdHr: 170 };

describe("a threshold session for a rider with an FTP of 250 W", () => {
  const timeline = buildTimeline(threshold, rider);

  it("is one block per step, repeats unrolled, end to end", () => {
    expect(timeline.blocks).toHaveLength(11);
    expect(timeline.seconds).toBe(600 + 3 * 600 + 30 + 300 + 300 + 60);
    expect(timeline.blocks.map((b) => [b.from, b.to]).slice(0, 3)).toEqual([
      [0, 600],
      [600, 1080],
      [1080, 1200],
    ]);
    expect(timeline.blocks[3]).toMatchObject({ repetition: 2, of: 3, intent: "work" });
  });

  it("holds the power the workout files write, from the rider's FTP", () => {
    const watts = timeline.blocks.map((b) => b.watts);
    // Zone 2 at 65 %, zone 4 at 98 %, zone 1 at 50 %, 95 % as written.
    expect(watts.slice(0, 3)).toEqual([163, 245, 125]);
    expect(timeline.blocks[8]!.watts).toBe(238);
  });

  it("counts a zone's whole band as on target, and five per cent either side of a single number", () => {
    expect(timeline.blocks[1]!.band).toEqual({ low: 228, high: 263 });
    expect(timeline.blocks[8]!.band).toEqual({ low: 226, high: 250 });
  });

  it("rides an open step and an RPE step freely", () => {
    expect(timeline.blocks[7]).toMatchObject({ watts: null, band: null });
    expect(timeline.blocks[9]).toMatchObject({ watts: null, band: null });
    expect(standing(timeline.blocks[7]!, 400, 1)).toBe("free");
  });

  it("holds a pulse target at the power of its zone, and keeps the pulse to show", () => {
    const pulse = timeline.blocks[10]!;
    expect(pulse.watts).toBe(163);
    expect(pulse.bpm).toEqual({ low: 145, high: 150 });
  });

  it("keeps the cadence a step asks for", () => {
    expect(timeline.blocks[1]!.cadence).toBe(90);
    expect(timeline.blocks[2]!.cadence).toBeNull();
  });
});

describe("where in the session the rider is", () => {
  const timeline = buildTimeline(threshold, rider);

  it("names the block, how far into it and how much is left", () => {
    expect(blockAt(timeline, 0)).toMatchObject({ index: 0, into: 0, remaining: 600 });
    expect(blockAt(timeline, 700)).toMatchObject({ index: 1, into: 100, remaining: 380 });
  });

  it("is nowhere once the session is over", () => {
    expect(blockAt(timeline, timeline.seconds)).toBeNull();
    expect(blockAt(timeline, -1)).toBeNull();
  });
});

describe("on target", () => {
  const work = buildTimeline(threshold, rider).blocks[1]!;

  it("is in the band, under it or over it", () => {
    expect(standing(work, 245, 1)).toBe("on");
    expect(standing(work, 200, 1)).toBe("under");
    expect(standing(work, 290, 1)).toBe("over");
    expect(standing(work, null, 1)).toBe("unknown");
  });

  it("moves with the rider's intensity", () => {
    expect(ergWatts(work, 0.9)).toBe(221);
    expect(standing(work, 215, 0.9)).toBe("on");
    expect(standing(work, 245, 0.8)).toBe("over");
  });
});

describe("a rider without an FTP", () => {
  const timeline = buildTimeline(threshold, { ftp: null, thresholdHr: null });

  it("rides every block freely: percent of nothing is no watts", () => {
    expect(timeline.blocks.every((b) => b.watts === null && b.band === null)).toBe(true);
    expect(standing(timeline.blocks[1]!, 245, 1)).toBe("free");
  });
});
