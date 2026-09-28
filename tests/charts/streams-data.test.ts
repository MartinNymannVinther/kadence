import { describe, expect, it } from "vitest";
import { findPauses, withoutPauses } from "@/components/activities/pauses";
import {
  MAX_POINTS,
  present,
  sameClock,
  spanOn,
  thin,
  type Streams,
} from "@/components/activities/streams-data";

/**
 * The drawn points of the curves are picks of the stored samples, zoomed
 * or not, and the chain from a drawn point back to the original sample
 * holds with pauses hidden — what keeps the route dot where the rider was.
 * A window belongs to the clock it was set on — the samples, not the
 * object — and is gone on a new clock.
 */

/** A ride in 5-second samples with a varying signal: `stops` are [from, to) sample ranges standing still. */
function ride(samples: number, stops: Array<[number, number]> = []): Streams {
  const still = (i: number) => stops.some(([a, b]) => i >= a && i < b);
  return {
    t: Array.from({ length: samples }, (_, i) => i * 5),
    power: Array.from({ length: samples }, (_, i) => (still(i) ? 0 : 150 + (i % 97))),
    hr: Array.from({ length: samples }, (_, i) => (still(i) ? 100 : 130 + (i % 31))),
    cadence: Array.from({ length: samples }, (_, i) => (still(i) ? 0 : 80 + (i % 13))),
    speed: Array.from({ length: samples }, (_, i) => (still(i) ? 0 : 8 + (i % 7))),
  };
}

describe("thin", () => {
  it("draws the very samples it names, whole ride and zoomed", () => {
    const streams = ride(1800);
    for (const span of [null, { lo: 400, hi: 700 }, { lo: 1000, hi: 1299 }]) {
      const data = thin(streams, span);
      expect(data.index.length).toBeLessThanOrEqual(MAX_POINTS);
      data.index.forEach((i, k) => {
        expect(data.t[k]).toBe(streams.t[i]);
        expect(data.values.power[k]).toBe(streams.power![i]);
        expect(data.values.hr[k]).toBe(streams.hr![i]);
        expect(data.values.speed[k]).toBeCloseTo(streams.speed![i]! * 3.6);
      });
    }
    const zoomed = thin(streams, { lo: 400, hi: 700 });
    expect(zoomed.step).toBe(1);
    expect(zoomed.index[0]).toBe(400);
    expect(zoomed.index.at(-1)).toBe(700);
  });

  it("keeps every drawn point inside the window, whatever the window", () => {
    const streams = ride(3000);
    const spans = [
      { lo: 0, hi: 11 },
      { lo: 2988, hi: 2999 },
      { lo: 17, hi: 1500 },
      { lo: 1234, hi: 2345 },
    ];
    for (const span of spans) {
      const data = thin(streams, span);
      expect(data.index.length).toBeLessThanOrEqual(MAX_POINTS);
      expect(data.index[0]).toBe(span.lo);
      data.index.forEach((i, k) => {
        expect(i).toBeGreaterThanOrEqual(span.lo);
        expect(i).toBeLessThanOrEqual(span.hi);
        expect(streams.t[i]).toBe(data.t[k]);
        expect(data.values.cadence[k]).toBe(streams.cadence![i]);
        expect(data.values.hr[k]).toBe(streams.hr![i]);
      });
    }
  });

  it("draws the whole ride with today's picks: every sample at a multiple of the step", () => {
    const streams = ride(1234);
    const data = thin(streams, null);
    expect(data.step).toBe(3);
    expect(data.index).toEqual(streams.t.map((_, i) => i).filter((i) => i % data.step === 0));
  });

  it("gives an absent channel nothing to show", () => {
    const data = thin(ride(100), null);
    expect(data.values.alt).toEqual([]);
    expect(present(data.values.alt)).toBe(false);
    expect(present(data.values.power)).toBe(true);
  });

  it("keeps a window while the streams are the same object", () => {
    const streams = ride(600);
    const stored = { streams, span: { lo: 100, hi: 200 } };
    expect(spanOn(stored, streams)).toBe(stored);
  });

  it("keeps a window when a server round trip hands over the same samples in a new object", () => {
    // A comment posted under the ride refreshes the page: the same clock, a new object.
    const streams = ride(600);
    const stored = { streams, span: { lo: 100, hi: 200 } };
    const refreshed = structuredClone(streams);
    expect(refreshed).not.toBe(streams);
    expect(spanOn(stored, refreshed)).toBe(stored);
  });

  it("forgets a window on a new clock, and does not bring it back with the old streams", () => {
    const real = ride(600);
    const pauseFree = ride(560);
    const stored = { streams: real, span: { lo: 100, hi: 200 } };
    const hidden = spanOn(stored, pauseFree);
    expect(hidden).toEqual({ streams: pauseFree, span: null });
    expect(spanOn(hidden, real)).toEqual({ streams: real, span: null });
  });

  it("tells the same clock from a new one by the samples, not the object", () => {
    const streams = ride(1200, [[300, 420]]);
    expect(sameClock(streams, streams)).toBe(true);
    expect(sameClock(streams, structuredClone(streams))).toBe(true);
    const view = withoutPauses(streams, findPauses(streams));
    expect(view.streams.t.length).toBeLessThan(streams.t.length);
    expect(sameClock(streams, view.streams)).toBe(false);
    // The same count of samples on another clock is another clock too.
    const shifted = { ...streams, t: streams.t.map((s) => s + 5) };
    expect(sameClock(streams, shifted)).toBe(false);
  });

  it("leads from a drawn point through the pause-free view back to the original sample", () => {
    const streams = ride(1200, [
      [300, 420],
      [800, 830],
    ]);
    const pauses = findPauses(streams);
    expect(pauses).toHaveLength(2);
    const paused = new Set(
      pauses.flatMap((p) => Array.from({ length: p.end - p.start + 1 }, (_, i) => p.start + i)),
    );
    const view = withoutPauses(streams, pauses);
    for (const span of [null, { lo: 250, hi: 500 }, { lo: 600, hi: 900 }]) {
      const data = thin(view.streams, span);
      data.index.forEach((j, k) => {
        const original = view.index[j]!;
        expect(paused.has(original)).toBe(false);
        expect(data.values.power[k]).toBe(streams.power![original]);
      });
    }
  });
});
