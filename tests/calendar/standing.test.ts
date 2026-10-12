import { describe, expect, it } from "vitest";
import { standingOf } from "@/modules/calendar/standing";
import type { Volume } from "@/modules/season/volume";

/**
 * How a month stands in the team's season (docs/adr/0093): against the
 * season plan when there is one, the paradigm's corridor otherwise, and
 * never for a month not begun.
 */

const volume = (over: Partial<Volume>): Volume => ({
  basis: "U19-1",
  dcu: { low: 24, target: 30, high: 36 },
  goal: null,
  planned: 0,
  done: 0,
  expected: 0,
  guided: true,
  ...over,
});

describe("a month's standing", () => {
  it("weighs where the month is heading against the season plan, within a tenth", () => {
    expect(standingOf(volume({ goal: 40, expected: 37 }), "2026-11", "2026-11-12")).toBe("on");
    expect(standingOf(volume({ goal: 40, expected: 30 }), "2026-11", "2026-11-12")).toBe("under");
    expect(standingOf(volume({ goal: 40, expected: 45 }), "2026-11", "2026-11-12")).toBe("over");
  });

  it("falls back on the corridor without a plan", () => {
    expect(standingOf(volume({ expected: 30 }), "2026-10", "2026-11-12")).toBe("on");
    expect(standingOf(volume({ expected: 10 }), "2026-10", "2026-11-12")).toBe("under");
    expect(standingOf(volume({ expected: 40 }), "2026-10", "2026-11-12")).toBe("over");
  });

  it("has none for a month not begun, nor without anything to stand against", () => {
    expect(standingOf(volume({ goal: 40 }), "2026-12", "2026-11-12")).toBeNull();
    expect(standingOf(volume({ dcu: null, guided: false }), "2026-10", "2026-11-12")).toBeNull();
  });
});
