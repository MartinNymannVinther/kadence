import { describe, expect, it } from "vitest";
import {
  HR_RATIO_CAP,
  deviation,
  intensityOfLoad,
  loadAt,
  type DeviationPlanned,
} from "@/modules/load";
import type { BikeStructure } from "@/modules/workouts/structure";

/**
 * A deviation in words instead of load numbers (docs/adr/0095, the
 * amendment of 13 October): the plan's character, the ride's average
 * share of threshold read back from its load, the effort against the
 * plan, the whole rounded to tens, and the hint that a threshold is set
 * too low.
 */

const TODAY = "2026-10-13";
const PAST = "2026-10-10";

/** Martin's ride: 1 t 15 min planned at load 53, 41 min ridden at 84 by power. */
const MARTIN = deviation(
  { minutes: 75, load: 53 },
  { minutes: 41, load: 84, method: "power" },
  PAST,
  TODAY,
);

const zones = (z: number, minutes: number): BikeStructure => ({
  kind: "bike",
  steps: [
    { kind: "step", intent: "work", seconds: minutes * 60, target: { kind: "zone", zone: z } },
  ],
});

describe("the intensity read back from the load", () => {
  it("is the inverse of the load's own formula", () => {
    expect(intensityOfLoad(loadAt(3600, 0.8), 60)).toBeCloseTo(0.8, 10);
    expect(intensityOfLoad(84, 41)).toBeCloseTo(1.109, 3);
    expect(intensityOfLoad(0, 60)).toBeNull();
    expect(intensityOfLoad(50, 0)).toBeNull();
  });
});

describe("the story of a deviation", () => {
  it("tells Martin's ride as an easy plan, a much harder ride at 111 % of FTP", () => {
    expect(MARTIN.heading).toBe("harder");
    expect(MARTIN.story).toEqual({
      plan: { character: "easy", minutes: 75 },
      ride: { minutes: 41, method: "power", intensityPct: 111, rpe: null, effort: "muchHarder" },
      whole: { direction: "more", pct: 60, times: null, time: "shorter" },
      thresholdHint: "ftp",
    });
  });

  it("reads a heart-rate ride's share of threshold the same way", () => {
    const d = deviation(
      { minutes: 60, load: 40 },
      { minutes: 60, load: 64, method: "hr" },
      PAST,
      TODAY,
    );
    expect(d.story?.ride).toMatchObject({ method: "hr", intensityPct: 80, effort: "muchHarder" });
    expect(d.story?.whole).toEqual({ direction: "more", pct: 60, times: null, time: "same" });
    expect(d.story?.thresholdHint).toBeNull();
  });

  it("has no share of threshold by RPE, and how it felt only when far off", () => {
    const d = deviation(
      { minutes: 60, load: 60 },
      { minutes: 60, load: 25, method: "rpe", rpe: 4 },
      PAST,
      TODAY,
    );
    // 25 of 60 is 42 %: far off, so the colour read the feeling.
    expect(d.measuredBy).toBe("load");
    expect(d.heading).toBe("easier");
    expect(d.story?.ride).toEqual({
      minutes: 60,
      method: "rpe",
      intensityPct: null,
      rpe: 4,
      // Load per hour 25 against 60: √(25/60) ≈ 0.65 of the plan's intensity.
      effort: "muchEasier",
    });
  });

  it("tells a near RPE ride by its time alone", () => {
    const d = deviation(
      { minutes: 60, load: 60 },
      { minutes: 40, load: 40, method: "rpe", rpe: 6 },
      PAST,
      TODAY,
    );
    // 40 of 60 felt is near: minutes decide, 67 %, shorter.
    expect(d.measuredBy).toBe("minutes");
    expect(d.heading).toBe("shorter");
    expect(d.story?.ride).toMatchObject({ method: "rpe", rpe: 6, effort: null });
    expect(d.story?.whole).toBeNull();
    expect(d.facts.map((f) => f.kind)).toEqual(["time", "noPlanDetail"]);
  });

  it("says only the time with nothing to measure effort by", () => {
    const d = deviation({ minutes: 75 }, { minutes: 42 }, PAST, TODAY);
    expect(d.story).toEqual({
      plan: { character: "easy", minutes: 75 },
      ride: { minutes: 42, method: "none", intensityPct: null, rpe: null, effort: null },
      whole: null,
      thresholdHint: null,
    });
  });

  it("names the plan from its zones, its load per hour, or its sport", () => {
    const character = (planned: DeviationPlanned) =>
      deviation(planned, { minutes: 10 }, PAST, TODAY).story?.plan.character;
    expect(character({ minutes: 60, structure: zones(2, 60) })).toBe("easy");
    expect(character({ minutes: 60, structure: zones(3, 60) })).toBe("tempo");
    expect(character({ minutes: 60, structure: zones(4, 60) })).toBe("threshold");
    expect(character({ minutes: 60, structure: zones(5, 60) })).toBe("intervals");
    // An hour at load 81 is 90 % of FTP: tempo.
    expect(character({ minutes: 60, load: 81 })).toBe("tempo");
    expect(character({ minutes: 60 })).toBe("easy");
    expect(character({ sport: "strength", minutes: 45 })).toBe("strength");
    expect(character({ sport: "other", minutes: 45 })).toBe("session");
  });

  it("never says the effort was the other way than the heading", () => {
    // 115 % of the minutes and 125 % of the load: about as hard per hour, yet harder.
    const d = deviation({ minutes: 60, load: 50 }, { minutes: 69, load: 63 }, PAST, TODAY);
    expect(d.heading).toBe("harder");
    expect(d.story?.ride.effort).toBe("harder");
  });
});

describe("the whole, rounded to tens", () => {
  const whole = (plannedLoad: number, doneLoad: number, doneMinutes = 60) =>
    deviation(
      { minutes: 60, load: plannedLoad },
      { minutes: doneMinutes, load: doneLoad },
      PAST,
      TODAY,
    ).story?.whole;

  it("rounds the difference to the nearest ten", () => {
    expect(whole(100, 124)?.pct).toBe(20);
    expect(whole(100, 126)?.pct).toBe(30);
    expect(whole(100, 64)?.pct).toBe(40);
    expect(whole(100, 66)?.pct).toBe(30);
  });

  it("says less as at most 90 % and twice or more as times", () => {
    expect(whole(100, 2)).toMatchObject({ direction: "less", pct: 90, times: null });
    expect(whole(100, 194)?.times).toBeNull();
    expect(whole(100, 195)?.times).toBe(2);
    expect(whole(100, 260)?.times).toBe(2.5);
  });

  it("says selvom and og from the time's direction", () => {
    expect(whole(50, 80, 40)?.time).toBe("shorter");
    expect(whole(50, 20, 100)?.time).toBe("longer");
    expect(whole(50, 80, 60)?.time).toBe("same");
  });

  it("is not there when the colour was read by minutes", () => {
    expect(
      deviation({ minutes: 60 }, { minutes: 30, load: 20 }, PAST, TODAY).story?.whole,
    ).toBeNull();
  });
});

describe("the hint that a threshold is set too low", () => {
  const hint = (minutes: number, load: number, method: "power" | "hr" | "rpe") =>
    deviation({ minutes: 60, load: 40 }, { minutes, load, method }, PAST, TODAY).story
      ?.thresholdHint;
  // An hour at 106 % of FTP is 112.36, at 105 % 110.25.
  it("comes by power from 20 minutes over 105 % of FTP", () => {
    expect(hint(60, 112, "power")).toBe("ftp");
    expect(hint(60, 110, "power")).toBeNull();
    expect(hint(20, Math.round(loadAt(20 * 60, 1.2)), "power")).toBe("ftp");
    expect(hint(19, Math.round(loadAt(19 * 60, 1.2)), "power")).toBeNull();
  });

  it("comes by heart rate when the load is at the cap", () => {
    const capped = (minutes: number) => Math.round(loadAt(minutes * 60, HR_RATIO_CAP));
    expect(hint(60, capped(60), "hr")).toBe("hr");
    expect(hint(20, capped(20), "hr")).toBe("hr");
    expect(hint(60, capped(60) - 1, "hr")).toBeNull();
    expect(hint(19, capped(19), "hr")).toBeNull();
  });

  it("never comes by RPE", () => {
    expect(hint(60, 140, "rpe")).toBeNull();
  });
});
