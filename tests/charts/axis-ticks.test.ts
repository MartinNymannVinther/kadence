import { describe, expect, it } from "vitest";
import {
  axisTicks,
  clockStamp,
  COARSE_WINDOW_S,
  GAP_PX,
  labelWidth,
  momentText,
} from "@/components/activities/axis-ticks";
import { linearScale } from "@/components/charts/scale";

/**
 * The ticks under the curves share one clock with a window's printed
 * ends and give way to them.
 */

/** An 896 px desktop chart: the plot runs from LEFT=36 to width−RIGHT=888. */
const plot: [number, number] = [36, 888];
/** A 390 px phone: the plot runs from 36 to 346. */
const phone: [number, number] = [36, 346];
/** A two-and-a-half-hour ride. */
const RIDE = 9000;
const on = (domain: [number, number]) => linearScale(domain, plot);
const texts = (ticks: ReturnType<typeof axisTicks>) => ticks.map((tick) => tick.text);
/** A window in a ride's clock, with its ends as the status prints them. */
const windowOn = (domain: [number, number], total = RIDE) => {
  const stamp = clockStamp(domain, total);
  return { stamp, ends: [stamp(domain[0]), stamp(domain[1])] as [string, string] };
};

describe("momentText", () => {
  it("keeps the hour digit through a ride of an hour or more, so it reads beside the total", () => {
    expect(momentText(2695, RIDE)).toBe("0:44:55");
    expect(momentText(295, RIDE)).toBe("0:04:55");
    expect(momentText(3905, RIDE)).toBe("1:05:05");
    expect(momentText(2695.4, RIDE)).toBe("0:44:55");
  });

  it("is m:ss on a ride under an hour", () => {
    expect(momentText(2695, 2700)).toBe("44:55");
    expect(momentText(5, 1800)).toBe("0:05");
  });
});

describe("clockStamp", () => {
  it("floors to the minute from a ten-minute window, and says the second below that", () => {
    expect(clockStamp([3000, 3000 + COARSE_WINDOW_S], RIDE)(3305)).toBe("0:55");
    expect(clockStamp([3000, 3000 + COARSE_WINDOW_S - 1], RIDE)(3305)).toBe("0:55:05");
    expect(clockStamp([600, 720], 1800)(665)).toBe("11:05");
  });
});

describe("axisTicks", () => {
  it("prints the whole ride's ticks as they come, h:mm", () => {
    const domain: [number, number] = [0, RIDE];
    const { stamp } = windowOn(domain);
    expect(texts(axisTicks(domain, plot, on(domain), stamp, null))).toEqual([
      "0:00",
      "0:20",
      "0:40",
      "1:00",
      "1:20",
      "1:40",
      "2:00",
      "2:20",
    ]);
  });

  it("says the second under ten minutes, in the ride's own shape", () => {
    const domain: [number, number] = [600, 720];
    const short = windowOn(domain, 1800);
    expect(texts(axisTicks(domain, plot, on(domain), short.stamp, null))).toEqual([
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
    ]);
    const long = windowOn(domain);
    expect(texts(axisTicks(domain, plot, on(domain), long.stamp, null))).toEqual([
      "0:10:00",
      "0:10:30",
      "0:11:00",
      "0:11:30",
      "0:12:00",
    ]);
  });

  it("gives a four-to-ten-minute window one shape, ticks and ends alike", () => {
    // Ticks a minute apart once said "0:51" beside ends saying "50:00" and "55:05".
    for (const [name, area] of [
      ["desktop", plot],
      ["phone", phone],
    ] as const) {
      for (const minutes of [4, 5, 8, 9.5]) {
        const domain: [number, number] = [3000, 3000 + minutes * 60 + 5];
        const { stamp, ends } = windowOn(domain);
        const ticks = axisTicks(domain, area, linearScale(domain, area), stamp, ends);
        expect(ticks.length, `${name} ${minutes} min`).toBeGreaterThan(0);
        for (const text of [...ends, ...texts(ticks)]) {
          expect(text, `${name} ${minutes} min`).toMatch(/^\d:\d\d:\d\d$/);
        }
      }
    }
    const domain: [number, number] = [3000, 3305];
    const { stamp, ends } = windowOn(domain);
    expect(ends).toEqual(["0:50:00", "0:55:05"]);
    expect(texts(axisTicks(domain, plot, on(domain), stamp, ends))).toEqual([
      "0:51:00",
      "0:52:00",
      "0:53:00",
      "0:54:00",
    ]);
  });

  it("drops a tick that would say the same as an end, floored to the minute", () => {
    // The window ends at 1:55:30; its end prints "1:55", and so would the tick at 1:55:00.
    const domain: [number, number] = [5760, 6930];
    const { stamp, ends } = windowOn(domain);
    expect(ends).toEqual(["1:36", "1:55"]);
    expect(texts(axisTicks(domain, plot, on(domain), stamp, ends))).toEqual([
      "1:40",
      "1:45",
      "1:50",
    ]);
  });

  it("drops a tick whose label would touch an end's, by the labels' widths", () => {
    // 1:55:00 lies 40 px from the right edge, once past the old fixed 28 px, still under a label and a gap.
    const domain: [number, number] = [5760, 6940];
    const x = on(domain);
    const { stamp, ends } = windowOn(domain);
    expect(plot[1] - x(6900)).toBeCloseTo(28.9, 0);
    expect(texts(axisTicks(domain, plot, x, stamp, ends))).toEqual(["1:40", "1:45", "1:50"]);
    // Far enough in, the tick stays: its half label plus the end's label and the gap fit.
    const roomy: [number, number] = [5760, 7200];
    const wide = windowOn(roomy);
    const kept = axisTicks(roomy, plot, on(roomy), wide.stamp, wide.ends);
    const last = kept.at(-1)!;
    expect(last.text).toBe("1:55");
    expect(plot[1] - on(roomy)(last.seconds)).toBeGreaterThanOrEqual(
      labelWidth("2:00") + GAP_PX + labelWidth("1:55") / 2,
    );
  });

  it("takes the room from h:mm:ss ends and ticks under ten minutes", () => {
    // 1:15:00–1:17:00 prints h:mm:ss at both ends and, stepping by 30 s, on every tick;
    // the ticks on the ends say the same as the ends and go.
    const domain: [number, number] = [4500, 4620];
    const x = on(domain);
    const { stamp, ends } = windowOn(domain);
    expect(ends).toEqual(["1:15:00", "1:17:00"]);
    const ticks = axisTicks(domain, plot, x, stamp, ends);
    expect(texts(ticks)).toEqual(["1:15:30", "1:16:00", "1:16:30"]);
    for (const tick of ticks) {
      const half = labelWidth(tick.text) / 2;
      expect(x(tick.seconds) - half).toBeGreaterThanOrEqual(
        plot[0] + labelWidth("1:15:00") + GAP_PX,
      );
      expect(x(tick.seconds) + half).toBeLessThanOrEqual(plot[1] - labelWidth("1:17:00") - GAP_PX);
    }
  });
});
