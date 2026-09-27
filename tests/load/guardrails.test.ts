import { describe, expect, it } from "vitest";
import {
  complianceFlag,
  corridorFlag,
  guardrails,
  longestRideFlag,
  painFlag,
  rampFlag,
  sleepFlag,
  strengthSpacingFlags,
  wellbeingFlag,
} from "@/modules/load/guardrails";
import type { WellbeingStatus } from "@/modules/load/wellbeing";

describe("DCU's corridor", () => {
  const corridor = { low: 8, target: 10, high: 12 };

  it("stays quiet inside it, its edges included", () => {
    expect(corridorFlag(12, corridor)).toBeNull();
    expect(corridorFlag(8, corridor)).toBeNull();
    expect(corridorFlag(20, null)).toBeNull();
  });

  it("warns above it and notes below it", () => {
    expect(corridorFlag(12.1, corridor)).toEqual({
      kind: "hours_above_corridor",
      severity: "warn",
      values: { hours: 12.1, low: 8, target: 10, high: 12 },
    });
    expect(corridorFlag(7.9, corridor)?.kind).toBe("hours_below_corridor");
    expect(corridorFlag(7.9, corridor)?.severity).toBe("info");
  });
});

describe("the ramp", () => {
  it("stays quiet at 15 % over the previous weeks", () => {
    expect(rampFlag(11.5, [10, 10, 10])).toBeNull();
  });

  it("warns above 15 %", () => {
    expect(rampFlag(11.6, [9, 10, 11])).toEqual({
      kind: "ramp",
      severity: "warn",
      values: { hours: 11.6, average: 10, percent: 16, limit: 15 },
    });
  });

  it("ignores a rise under an hour and a week without a baseline", () => {
    expect(rampFlag(2.9, [2, 2, 2])).toBeNull();
    expect(rampFlag(3, [2, 2, 2])?.kind).toBe("ramp");
    expect(rampFlag(10, [])).toBeNull();
    expect(rampFlag(10, [0, 0, 0])).toBeNull();
  });
});

describe("the longest ride", () => {
  const u17 = { hours: 4, km: 120 };

  it("stays quiet at the limit", () => {
    expect(longestRideFlag({ hours: 4, km: 120 }, u17)).toBeNull();
    expect(longestRideFlag({ hours: 4, km: null }, u17)).toBeNull();
    expect(longestRideFlag({ hours: 6, km: 180 }, null)).toBeNull();
  });

  it("warns over either hours or kilometres", () => {
    expect(longestRideFlag({ hours: 4.1, km: 110 }, u17)).toEqual({
      kind: "longest_ride",
      severity: "warn",
      values: { hours: 4.1, km: 110, limitHours: 4, limitKm: 120 },
    });
    expect(longestRideFlag({ hours: 3.8, km: 121 }, u17)?.kind).toBe("longest_ride");
  });
});

describe("strength sessions 48 hours apart", () => {
  it("stays quiet two days apart", () => {
    expect(strengthSpacingFlags(["2026-09-21", "2026-09-23", "2026-09-25"])).toEqual([]);
  });

  it("warns for each pair a day apart or on the same day", () => {
    expect(strengthSpacingFlags(["2026-09-24", "2026-09-21", "2026-09-22"])).toEqual([
      {
        kind: "strength_spacing",
        severity: "warn",
        values: { first: "2026-09-21", second: "2026-09-22", days: 1 },
      },
    ]);
    expect(strengthSpacingFlags(["2026-09-21", "2026-09-21"])[0]?.values.days).toBe(0);
  });
});

describe("wellbeing", () => {
  const status = (over: Partial<WellbeingStatus>): WellbeingStatus => ({
    zone: "yellow",
    yellowDays: 5,
    since: "2026-09-21",
    action: "talk",
    signs: ["low_answer", "short_sleep"],
    ...over,
  });

  it("stays quiet when there is nothing to do", () => {
    expect(
      wellbeingFlag(status({ zone: "green", action: "none", since: null, signs: [] })),
    ).toBeNull();
    expect(wellbeingFlag(null)).toBeNull();
  });

  it("warns for a talk and alerts for help", () => {
    expect(wellbeingFlag(status({}))).toEqual({
      kind: "wellbeing_talk",
      severity: "warn",
      values: {
        zone: "yellow",
        yellowDays: 5,
        since: "2026-09-21",
        signs: "low_answer,short_sleep",
      },
    });
    const help = wellbeingFlag(status({ zone: "red", action: "help", signs: ["ill"] }));
    expect(help?.kind).toBe("wellbeing_help");
    expect(help?.severity).toBe("alert");
  });
});

describe("ATK's pain ladder", () => {
  it("stays quiet for mild soreness", () => {
    expect(painFlag(0)).toBeNull();
    expect(painFlag(1)).toBeNull();
    expect(painFlag(null)).toBeNull();
  });

  it("warns at 2 and alerts at 3", () => {
    expect(painFlag(2)).toEqual({ kind: "pain", severity: "warn", values: { pain: 2 } });
    expect(painFlag(3)).toEqual({ kind: "pain", severity: "alert", values: { pain: 3 } });
  });
});

describe("sleep", () => {
  const week = (hours: number) => Array.from({ length: 7 }, () => hours);

  it("stays quiet at the minimum", () => {
    expect(sleepFlag(week(8), 8)).toBeNull();
  });

  it("notes an average under the minimum and warns under 7 hours", () => {
    expect(sleepFlag(week(7.9), 8)).toEqual({
      kind: "sleep_below_minimum",
      severity: "info",
      values: { average: 7.9, nights: 7, minimum: 8 },
    });
    expect(sleepFlag(week(7), 8)?.kind).toBe("sleep_below_minimum");
    expect(sleepFlag(week(6.9), 8)).toEqual({
      kind: "sleep_short",
      severity: "warn",
      values: { average: 6.9, nights: 7, minimum: 8, limit: 7 },
    });
  });

  it("needs three reported nights to see a trend", () => {
    expect(sleepFlag([5, 5, null, null, null, null, null], 8)).toBeNull();
    expect(sleepFlag([5, 5, 5, null], 8)?.kind).toBe("sleep_short");
  });
});

describe("planned against done", () => {
  it("stays quiet with a single red, or reds under half", () => {
    expect(complianceFlag(["red", "green"])).toBeNull();
    expect(complianceFlag(["red", "red", "green", "green", "green"])).toBeNull();
  });

  it("notes when half or more of the judged sessions are red", () => {
    expect(complianceFlag(["red", "red", "green", "yellow"])).toEqual({
      kind: "compliance",
      severity: "info",
      values: { red: 2, judged: 4 },
    });
    expect(complianceFlag(["red", "red", "grey", "grey", "none"])?.values).toEqual({
      red: 2,
      judged: 2,
    });
  });
});

describe("the week's guardrails together", () => {
  it("are empty for a quiet week", () => {
    expect(
      guardrails({
        bikeHours: 10,
        corridor: { low: 8, target: 10, high: 12 },
        previousWeeksHours: [9, 10, 10],
        longestRide: { hours: 3, km: 90 },
        longestRideLimit: { hours: 4, km: 120 },
        strengthDates: ["2026-09-21", "2026-09-24"],
        latestPain: 0,
        sleepHours: [8, 8.5, 9, 8, 8, 8.5, 9],
        sleepMinimum: 8,
        compliance: ["green", "green", "yellow"],
      }),
    ).toEqual([]);
  });

  it("put the most serious first", () => {
    const flags = guardrails({
      bikeHours: 14,
      corridor: { low: 8, target: 10, high: 12 },
      previousWeeksHours: [10, 10, 10],
      latestPain: 3,
      compliance: ["red", "red"],
    });
    expect(flags.map((f) => [f.kind, f.severity])).toEqual([
      ["pain", "alert"],
      ["hours_above_corridor", "warn"],
      ["ramp", "warn"],
      ["compliance", "info"],
    ]);
  });
});
