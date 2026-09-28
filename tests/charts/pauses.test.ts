import { describe, expect, it } from "vitest";
import {
  findPauses,
  hasSymbol,
  MIN_PAUSE_SECONDS,
  pauseKind,
  SYMBOL_MIN_SECONDS,
  withoutPauses,
} from "@/components/activities/pauses";
import type { Streams } from "@/components/activities/streams-chart";

/** Pauses on the curves: found, named by length, and taken out of the view only. */

/** A ride in 5-second samples: `stops` are [from, to) sample ranges standing still. */
function ride(samples: number, stops: Array<[number, number, "still" | "gap"]>): Streams {
  const still = (i: number) => stops.find(([a, b]) => i >= a && i < b)?.[2];
  const at = (i: number, moving: number, standing: number | null) =>
    still(i) === "gap" ? null : still(i) === "still" ? standing : moving;
  return {
    t: Array.from({ length: samples }, (_, i) => i * 5),
    power: Array.from({ length: samples }, (_, i) => at(i, 200, 0)),
    hr: Array.from({ length: samples }, (_, i) => at(i, 140, 100)),
    cadence: Array.from({ length: samples }, (_, i) => at(i, 90, 0)),
    speed: Array.from({ length: samples }, (_, i) => at(i, 9, 0)),
    lat: Array.from({ length: samples }, (_, i) => 55 + i * 1e-4),
    lon: Array.from({ length: samples }, () => 12),
  };
}

describe("pauses", () => {
  it("finds every stop of a quarter minute or more, standing or unrecorded, and names the longer by length", () => {
    const streams = ride(1000, [
      [100, 160, "still"], // 5 min
      [300, 480, "gap"], // 15 min
      [600, 960, "still"], // 30 min
      [970, 980, "still"], // 50 s: a red light, a pause without a symbol
      [985, 987, "still"], // 10 s: not a pause
    ]);
    const pauses = findPauses(streams);
    expect(pauses.map((p) => [p.seconds, p.kind])).toEqual([
      [300, "soda"],
      [900, "coffee"],
      [1800, "lunch"],
      [50, "stop"],
    ]);
    expect(pauses.map((p) => hasSymbol(p.kind))).toEqual([true, true, true, false]);
  });

  it("does not call standing at the start or end of a ride a pause", () => {
    expect(
      findPauses(
        ride(400, [
          [0, 100, "still"],
          [300, 400, "still"],
        ]),
      ),
    ).toEqual([]);
  });

  it("takes the pauses out of the view, the clock running on, and remembers where each sample was", () => {
    const streams = ride(400, [[100, 200, "still"]]);
    const pauses = findPauses(streams);
    const view = withoutPauses(streams, pauses);
    expect(view.streams.t).toHaveLength(300);
    expect(view.streams.t[150]).toBe(750);
    expect(view.index[100]).toBe(200);
    expect(view.joins).toEqual([{ t: 500, pause: pauses[0] }]);
    expect(view.streams.power!.every((w) => w === 200)).toBe(true);
  });

  it("names the lengths at their thresholds", () => {
    expect(MIN_PAUSE_SECONDS).toBe(15);
    expect(SYMBOL_MIN_SECONDS).toBe(300);
    expect(pauseKind(60)).toBe("stop");
    expect(pauseKind(300)).toBe("soda");
    expect(pauseKind(15 * 60)).toBe("coffee");
    expect(pauseKind(30 * 60)).toBe("lunch");
  });
});
