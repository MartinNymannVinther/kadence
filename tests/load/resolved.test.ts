import { describe, expect, it } from "vitest";
import { FLAG_SECTION } from "@/modules/coach/flag-sections";
import {
  FLAG_KINDS,
  TRAINING_KINDS,
  WELLBEING_KINDS,
  splitResolved,
  worseThan,
  type Flag,
  type ResolutionKey,
} from "@/modules/load";

/**
 * A coach's "afklaret" against the week's flags (ADR 0026): held down by
 * kind, severity and the numbers the coach saw; back when it gets worse.
 * Pure.
 */

const flag = (kind: Flag["kind"], severity: Flag["severity"], values: Flag["values"]): Flag => ({
  kind,
  severity,
  values,
});
const key = (
  kind: Flag["kind"],
  severity: Flag["severity"],
  seen: Flag["values"][],
): ResolutionKey => ({ kind, severity, seen });
const kinds = (flags: Flag[]) => flags.map((f) => f.kind);

describe("the flag kinds", () => {
  it("are partitioned into training and wellbeing, with no kind in both or neither", () => {
    expect([...TRAINING_KINDS, ...WELLBEING_KINDS]).toEqual([...FLAG_KINDS]);
    expect(new Set(FLAG_KINDS).size).toBe(FLAG_KINDS.length);
  });

  it("each point at a section of the coach guide", () => {
    for (const kind of FLAG_KINDS) expect(FLAG_SECTION[kind], kind).toBeDefined();
  });
});

describe("splitResolved", () => {
  const ramp = flag("ramp", "warn", { hours: 12, average: 10, percent: 20, limit: 15 });

  it("holds a flag of the same kind, severity and values", () => {
    const { open, resolved } = splitResolved([ramp], [key("ramp", "warn", [ramp.values])]);
    expect(open).toEqual([]);
    expect(resolved.map((r) => r.flag.kind)).toEqual(["ramp"]);
  });

  it("lets a flag above the resolution's severity, or of another kind, through", () => {
    const pain = flag("pain", "alert", { pain: 3 });
    expect(kinds(splitResolved([pain], [key("pain", "warn", [{ pain: 2 }])]).open)).toEqual([
      "pain",
    ]);
    expect(kinds(splitResolved([ramp], [key("pain", "alert", [])]).open)).toEqual(["ramp"]);
  });

  it("holds by severity alone when nothing was snapshotted, and opens everything without resolutions", () => {
    expect(splitResolved([ramp], [key("ramp", "warn", [])]).resolved).toHaveLength(1);
    expect(splitResolved([ramp], []).open).toEqual([ramp]);
  });

  it("keeps the guardrails' order among the open flags", () => {
    const a = flag("pain", "alert", { pain: 3 });
    const b = flag("sleep_short", "warn", { average: 6.5, nights: 5, limit: 7 });
    const c = flag("compliance", "info", { red: 2, judged: 3 });
    const { open } = splitResolved([a, b, c], [key("sleep_short", "warn", [b.values])]);
    expect(open).toEqual([a, c]);
  });

  it("holds through the week's drift: Monday's planned session ridden five minutes long", () => {
    // Resolved on Monday with the week's open planned sessions counted in.
    const seen = [
      key("hours_above_corridor", "warn", [{ hours: 7.1, low: 5, target: 6, high: 6.5 }]),
      key("ramp", "warn", [{ hours: 7.1, average: 5.9, percent: 20, limit: 15 }]),
      key("sleep_short", "warn", [{ average: 6.5, nights: 7, limit: 7 }]),
      key("hours_below_corridor", "info", [{ hours: 5, low: 5.5, target: 6, high: 6.5 }]),
    ];
    // Tuesday: 1h30 ridden as 1h35, and one short night in the average.
    const tuesday = [
      flag("hours_above_corridor", "warn", { hours: 7.2, low: 5, target: 6, high: 6.5 }),
      flag("ramp", "warn", { hours: 7.2, average: 5.9, percent: 22, limit: 15 }),
      flag("sleep_short", "warn", { average: 6.4, nights: 7, limit: 7 }),
      flag("hours_below_corridor", "info", { hours: 4.9, low: 5.5, target: 6, high: 6.5 }),
    ];
    expect(splitResolved(tuesday, seen).open).toEqual([]);
    expect(splitResolved(tuesday, seen).resolved).toHaveLength(4);

    // Friday: a whole step worse on each — back on the list.
    const friday = [
      flag("hours_above_corridor", "warn", { hours: 7.6, low: 5, target: 6, high: 6.5 }),
      flag("ramp", "warn", { hours: 7.6, average: 5.9, percent: 29, limit: 15 }),
      flag("sleep_short", "warn", { average: 6, nights: 7, limit: 7 }),
      flag("hours_below_corridor", "info", { hours: 4.5, low: 5.5, target: 6, high: 6.5 }),
    ];
    expect(splitResolved(friday, seen).open).toEqual(friday);
  });

  it("holds two strength pairs seen together and opens a third", () => {
    const one = flag("strength_spacing", "warn", {
      first: "2026-11-02",
      second: "2026-11-03",
      days: 1,
    });
    const two = flag("strength_spacing", "warn", {
      first: "2026-11-05",
      second: "2026-11-06",
      days: 1,
    });
    const three = flag("strength_spacing", "warn", {
      first: "2026-11-07",
      second: "2026-11-08",
      days: 1,
    });
    const seen = [key("strength_spacing", "warn", [one.values, two.values])];
    const { open, resolved } = splitResolved([one, two, three], seen);
    expect(resolved).toHaveLength(2);
    expect(open).toEqual([three]);
  });
});

describe("worseThan", () => {
  const cases: Array<[string, Flag, Flag["values"], boolean]> = [
    ["a steeper ramp", flag("ramp", "warn", { percent: 45 }), { percent: 20 }, true],
    ["a ramp five points steeper", flag("ramp", "warn", { percent: 25 }), { percent: 20 }, true],
    ["a ramp two points steeper", flag("ramp", "warn", { percent: 22 }), { percent: 20 }, false],
    ["a gentler ramp", flag("ramp", "warn", { percent: 18 }), { percent: 20 }, false],
    [
      "more hours over the corridor",
      flag("hours_above_corridor", "warn", { hours: 14 }),
      { hours: 12.5 },
      true,
    ],
    [
      "half an hour more over the corridor",
      flag("hours_above_corridor", "warn", { hours: 7.6 }),
      { hours: 7.1 },
      true,
    ],
    [
      "six minutes more over the corridor",
      flag("hours_above_corridor", "warn", { hours: 7.2 }),
      { hours: 7.1 },
      false,
    ],
    [
      "fewer hours under it",
      flag("hours_below_corridor", "info", { hours: 3 }),
      { hours: 5 },
      true,
    ],
    [
      "six minutes fewer under it",
      flag("hours_below_corridor", "info", { hours: 4.9 }),
      { hours: 5 },
      false,
    ],
    [
      "more hours under it",
      flag("hours_below_corridor", "info", { hours: 6 }),
      { hours: 5 },
      false,
    ],
    ["a higher rung of the pain ladder", flag("pain", "alert", { pain: 3 }), { pain: 2 }, true],
    ["a lower rung", flag("pain", "warn", { pain: 2 }), { pain: 3 }, false],
    [
      "half an hour less sleep",
      flag("sleep_short", "warn", { average: 6 }),
      { average: 6.5 },
      true,
    ],
    ["a tenth less sleep", flag("sleep_short", "warn", { average: 6.4 }), { average: 6.5 }, false],
    [
      "less sleep under the minimum",
      flag("sleep_below_minimum", "info", { average: 7 }),
      { average: 7.5 },
      true,
    ],
    [
      "a tenth less under the minimum",
      flag("sleep_below_minimum", "info", { average: 7.4 }),
      { average: 7.5 },
      false,
    ],
    [
      "more yellow days",
      flag("wellbeing_talk", "warn", { zone: "yellow", yellowDays: 5 }),
      { zone: "yellow", yellowDays: 2 },
      false,
    ],
    [
      "red after a long yellow",
      flag("wellbeing_help", "alert", { zone: "red", yellowDays: 9 }),
      { zone: "yellow", yellowDays: 9 },
      true,
    ],
    [
      "still a long yellow",
      flag("wellbeing_help", "alert", { zone: "yellow", yellowDays: 11 }),
      { zone: "yellow", yellowDays: 9 },
      false,
    ],
    [
      "a longer ride",
      flag("longest_ride", "warn", { hours: 5.5, km: 140 }),
      { hours: 4.5, km: 140 },
      true,
    ],
    [
      "a farther ride",
      flag("longest_ride", "warn", { hours: 4.5, km: 160 }),
      { hours: 4.5, km: 140 },
      true,
    ],
    [
      "a ride six minutes and five kilometres longer",
      flag("longest_ride", "warn", { hours: 4.6, km: 145 }),
      { hours: 4.5, km: 140 },
      false,
    ],
    [
      "the same ride",
      flag("longest_ride", "warn", { hours: 4.5, km: 140 }),
      { hours: 4.5, km: 140 },
      false,
    ],
    [
      "more red sessions",
      flag("compliance", "info", { red: 3, judged: 4 }),
      { red: 2, judged: 3 },
      true,
    ],
    [
      "a strength pair not seen",
      flag("strength_spacing", "warn", { first: "2026-11-07", second: "2026-11-08" }),
      { first: "2026-11-02", second: "2026-11-03" },
      true,
    ],
  ];

  it.each(cases)("%s", (_label, now, seen, expected) => {
    expect(worseThan(now, seen)).toBe(expected);
  });
});
