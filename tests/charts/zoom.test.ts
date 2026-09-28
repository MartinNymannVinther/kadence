import { describe, expect, it } from "vitest";
import { findPauses, withoutPauses } from "@/components/activities/pauses";
import type { Streams } from "@/components/activities/streams-data";
import {
  canShift,
  clampSpan,
  MIN_SPAN_SAMPLES,
  nearestDrawn,
  shiftSpan,
  spanFromSeconds,
  thinIndices,
  timeTicks,
  zoomSpan,
} from "@/components/charts/zoom";

/** The arithmetic under zooming into a stretch of the curves: spans, thinning and ticks. */

const fives = (n: number) => Array.from({ length: n }, (_, i) => i * 5);
const width = (s: { lo: number; hi: number }) => s.hi - s.lo + 1;

/** A ride in 5-second samples; `stops` are [from, to) sample ranges standing still. */
function ride(samples: number, stops: Array<[number, number]>): Streams {
  const still = (i: number) => stops.some(([a, b]) => i >= a && i < b);
  const each = (moving: (i: number) => number, stopped: number) =>
    Array.from({ length: samples }, (_, i) => (still(i) ? stopped : moving(i)));
  return {
    t: fives(samples),
    power: each((i) => 150 + (i % 97), 0),
    cadence: each((i) => 80 + (i % 13), 0),
    speed: each((i) => 8 + (i % 7), 0),
  };
}

describe("thinIndices", () => {
  it("draws the whole ride with today's picks", () => {
    const { index, step } = thinIndices(1440, null, 480);
    expect(step).toBe(3);
    expect(index).toHaveLength(480);
    expect(index.every((i, k) => i === 3 * k)).toBe(true);
  });

  it("draws a short span at full resolution and a long one thinned", () => {
    const short = thinIndices(1440, { lo: 100, hi: 112 }, 480);
    expect(short.step).toBe(1);
    expect(short.index).toEqual(Array.from({ length: 13 }, (_, i) => 100 + i));
    const long = thinIndices(5000, { lo: 1000, hi: 2999 }, 480);
    expect(long.step).toBe(5);
    expect(long.index[0]).toBe(1000);
    expect(long.index.every((i) => i <= 2999)).toBe(true);
    expect(long.index.length).toBeLessThanOrEqual(480);
  });
});

describe("clampSpan", () => {
  it("orders the ends", () => {
    expect(clampSpan({ lo: 300, hi: 100 }, 1000)).toEqual({ lo: 100, hi: 300 });
  });

  it("widens a narrow span to the floor around its centre", () => {
    const span = clampSpan({ lo: 10, hi: 12 }, 1000)!;
    expect(width(span)).toBe(MIN_SPAN_SAMPLES);
    expect(span.lo).toBeLessThanOrEqual(10);
    expect(span.hi).toBeGreaterThanOrEqual(12);
    expect(Math.abs((span.lo + span.hi) / 2 - 11)).toBeLessThanOrEqual(1);
  });

  it("slides at the ends instead of shrinking", () => {
    expect(clampSpan({ lo: -20, hi: 79 }, 1000)).toEqual({ lo: 0, hi: 99 });
    expect(clampSpan({ lo: 950, hi: 1049 }, 1000)).toEqual({ lo: 900, hi: 999 });
  });

  it("is null when it covers the ride, and for a ride shorter than the floor", () => {
    expect(clampSpan({ lo: 0, hi: 999 }, 1000)).toBeNull();
    expect(clampSpan({ lo: -5, hi: 1200 }, 1000)).toBeNull();
    expect(clampSpan({ lo: 2, hi: 4 }, 10)).toBeNull();
  });
});

describe("spanFromSeconds", () => {
  const t = fives(1000);

  it("gives the same span whichever way the drag went", () => {
    expect(spanFromSeconds(t, 500, 1500)).toEqual(spanFromSeconds(t, 1500, 500));
    expect(spanFromSeconds(t, 500, 1500)).toEqual({ lo: 100, hi: 300 });
  });

  it("takes both neighbours of a drag between samples", () => {
    expect(spanFromSeconds(t, 502, 1503)).toEqual({ lo: 100, hi: 301 });
  });

  it("clamps at the ends", () => {
    expect(spanFromSeconds(t, -50, 100)).toEqual({ lo: 0, hi: 20 });
    expect(spanFromSeconds(t, 4900, 9999)).toEqual({ lo: 980, hi: 999 });
    expect(spanFromSeconds(t, -50, 9999)).toBeNull();
  });
});

describe("zoomSpan", () => {
  it("halves the whole ride around the anchor, keeping its fraction", () => {
    const span = zoomSpan(null, 1000, 0.5, 250)!;
    expect(width(span)).toBeCloseTo(500, -1);
    expect((250 - span.lo) / (span.hi - span.lo)).toBeCloseTo(0.25, 1);
  });

  it("halves around the centre when there is no anchor", () => {
    const span = zoomSpan({ lo: 200, hi: 600 }, 1000, 0.5)!;
    expect((span.lo + span.hi) / 2).toBe(400);
    expect(span.hi - span.lo).toBe(200);
  });

  it("stops at the floor", () => {
    const span = zoomSpan({ lo: 100, hi: 100 + MIN_SPAN_SAMPLES - 1 }, 1000, 0.5)!;
    expect(width(span)).toBe(MIN_SPAN_SAMPLES);
  });

  it("is null once doubling passes the ride", () => {
    expect(zoomSpan({ lo: 200, hi: 800 }, 1000, 2)).toBeNull();
    expect(zoomSpan({ lo: 400, hi: 500 }, 1000, 2)).toEqual({ lo: 350, hi: 550 });
  });
});

describe("shiftSpan and canShift", () => {
  it("moves by half a width and keeps the width at the ends", () => {
    expect(shiftSpan({ lo: 100, hi: 199 }, 1000, 1)).toEqual({ lo: 150, hi: 249 });
    expect(shiftSpan({ lo: 100, hi: 199 }, 1000, -1)).toEqual({ lo: 50, hi: 149 });
    expect(shiftSpan({ lo: 880, hi: 979 }, 1000, 1)).toEqual({ lo: 900, hi: 999 });
    expect(shiftSpan({ lo: 20, hi: 119 }, 1000, -1)).toEqual({ lo: 0, hi: 99 });
  });

  it("knows when there is nowhere to go", () => {
    expect(canShift(null, 1000, 1)).toBe(false);
    expect(canShift({ lo: 0, hi: 99 }, 1000, -1)).toBe(false);
    expect(canShift({ lo: 0, hi: 99 }, 1000, 1)).toBe(true);
    expect(canShift({ lo: 900, hi: 999 }, 1000, 1)).toBe(false);
    expect(canShift({ lo: 900, hi: 999 }, 1000, -1)).toBe(true);
  });
});

describe("nearestDrawn", () => {
  const t = fives(1000);
  const index = [0, 3, 6, 9, 12];

  it("picks the nearest drawn point, the earlier on a tie", () => {
    expect(nearestDrawn(index, t, 16)).toBe(1);
    expect(nearestDrawn(index, t, 29)).toBe(2);
    expect(nearestDrawn(index, t, 22.5)).toBe(1);
    expect(nearestDrawn(index, t, -10)).toBe(0);
    expect(nearestDrawn(index, t, 999)).toBe(4);
  });
});

describe("a zoom keeps the moment being read", () => {
  const anchors = [0, 7, 450, 899, 1234, 1799];

  it("lands within a step of the anchor on the real clock", () => {
    const t = fives(1800);
    for (const i of anchors) {
      const span = zoomSpan(null, 1800, 0.5, i);
      const { index, step } = thinIndices(1800, span, 480);
      const k = nearestDrawn(index, t, t[i]!);
      expect(Math.abs(index[k]! - i)).toBeLessThanOrEqual(step);
    }
  });

  it("lands beside the anchor with the pauses hidden, never on a paused sample", () => {
    const streams = ride(1800, [
      [300, 420],
      [1000, 1030],
    ]);
    const pauses = findPauses(streams);
    expect(pauses).toHaveLength(2);
    const paused = new Set(
      pauses.flatMap((p) => Array.from({ length: p.end - p.start + 1 }, (_, i) => p.start + i)),
    );
    const view = withoutPauses(streams, pauses);
    const count = view.streams.t.length;
    for (const i of anchors.filter((a) => a < count)) {
      const span = zoomSpan(null, count, 0.5, i);
      const { index, step } = thinIndices(count, span, 480);
      const k = nearestDrawn(index, view.streams.t, view.streams.t[i]!);
      expect(Math.abs(index[k]! - i)).toBeLessThanOrEqual(step);
      expect(paused.has(view.index[index[k]!]!)).toBe(false);
    }
  });
});

describe("timeTicks", () => {
  it("climbs the clock ladder to fit the count", () => {
    expect(timeTicks(42, 162, 4)).toEqual([60, 90, 120, 150]);
    expect(timeTicks(0, 9060, 4)).toEqual([0, 3600, 7200]);
    expect(timeTicks(0, 5 * 3600, 8)).toEqual([0, 3600, 7200, 10800, 14400, 18000]);
  });
});
