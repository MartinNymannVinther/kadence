import { describe, expect, it } from "vitest";
import {
  colourOfPct,
  compliance,
  deviation,
  type DeviationFact,
  type DeviationPlanned,
} from "@/modules/load";
import type { BikeStructure } from "@/modules/workouts/structure";

/**
 * Why a session went off its plan (docs/adr/0095): the facts for each
 * kind of deviation, and — above all — that the explanation always agrees
 * with the colour the calendar shows.
 */

const TODAY = "2026-10-12";
const PAST = "2026-10-10";

const zone = (z: number, minutes: number, intent: "steady" | "work" | "recover" = "steady") => ({
  kind: "step" as const,
  intent,
  seconds: minutes * 60,
  target: { kind: "zone" as const, zone: z },
});

/** 15 min in zone 2, 4 × (5 min zone 4, 3 min zone 1), 10 min in zone 2: built around zone 4. */
const INTERVALS: BikeStructure = {
  kind: "bike",
  steps: [
    zone(2, 15),
    {
      kind: "repeat",
      times: 4,
      steps: [zone(4, 5, "work"), zone(1, 3, "recover")],
    },
    zone(2, 10),
  ],
};

const EASY: BikeStructure = { kind: "bike", steps: [zone(2, 60)] };

const kinds = (facts: DeviationFact[]) => facts.map((f) => f.kind);

describe("the facts for each deviation", () => {
  it("says a ride was shorter, in minutes, when the plan has only a duration", () => {
    const d = deviation({ minutes: 75 }, { minutes: 42 }, PAST, TODAY);
    expect(d).toMatchObject({ colour: "yellow", measuredBy: "minutes", heading: "shorter" });
    expect(d.facts).toEqual([
      { kind: "time", planned: 75, done: 42, changePct: -44 },
      { kind: "noPlanDetail" },
    ]);
  });

  it("says a ride was longer", () => {
    const d = deviation({ minutes: 60 }, { minutes: 100 }, PAST, TODAY);
    expect(d).toMatchObject({ colour: "red", heading: "longer" });
    expect(d.facts[0]).toEqual({ kind: "time", planned: 60, done: 100, changePct: 67 });
  });

  it("says a ride as long as planned but heavier was harder, load first", () => {
    const d = deviation({ minutes: 60, load: 50 }, { minutes: 62, load: 80 }, PAST, TODAY);
    expect(d).toMatchObject({ colour: "red", measuredBy: "load", heading: "harder" });
    expect(kinds(d.facts)).toEqual(["load", "time", "noPlanDetail"]);
    expect(d.facts[0]).toEqual({ kind: "load", planned: 50, done: 80, changePct: 60 });
  });

  it("says a lighter ride of the same length was easier", () => {
    const d = deviation({ minutes: 60, load: 50 }, { minutes: 60, load: 30 }, PAST, TODAY);
    expect(d).toMatchObject({ colour: "yellow", heading: "easier" });
  });

  it("calls a ride read by load shorter when its minutes were short too", () => {
    const d = deviation({ minutes: 75, load: 60 }, { minutes: 40, load: 30 }, PAST, TODAY);
    expect(d).toMatchObject({ colour: "yellow", measuredBy: "load", heading: "shorter" });
    expect(kinds(d.facts)).toEqual(["time", "load", "noPlanDetail"]);
  });

  it("says a session on a day that passed was not done", () => {
    const d = deviation({ minutes: 75 }, null, PAST, TODAY);
    expect(d).toEqual({
      colour: "red",
      measuredBy: null,
      heading: "missed",
      facts: [{ kind: "missed", plannedMinutes: 75 }],
      story: null,
    });
  });

  it("has nothing to explain today, ahead, or as planned", () => {
    expect(deviation({ minutes: 75 }, null, TODAY, TODAY).heading).toBeNull();
    expect(deviation({ minutes: 60 }, { minutes: 58 }, PAST, TODAY).heading).toBeNull();
  });

  it("reads the zones a structured session was built around against the ride's", () => {
    // An hour, mostly in zone 2, only six minutes in zone 4 or above.
    const ride = { power: [300, 2400, 900, 360, 0, 0, 0] };
    const d = deviation(
      { minutes: 57, load: 70, structure: INTERVALS },
      { minutes: 66, load: 40, zoneSeconds: ride },
      PAST,
      TODAY,
    );
    expect(d.heading).toBe("easier");
    const intensity = d.facts.find((f) => f.kind === "intensity");
    expect(intensity).toEqual({
      kind: "intensity",
      source: "power",
      builtAround: 4,
      plannedMinutes: 20,
      doneMinutes: 6,
      mostZone: 2,
      // Zones 1, 2 and 4 are the plan's: 300 + 2400 + 360 of 3960 seconds.
      inPlanPct: 77,
    });
    expect(kinds(d.facts)).not.toContain("noPlanDetail");
  });

  it("falls back to pulse zones, and says nothing of zones without them", () => {
    const hr = deviation(
      { minutes: 60, structure: EASY },
      {
        minutes: 30,
        zoneSeconds: { power: [0, 0, 0, 0, 0, 0, 0], hr: [0, 600, 1200, 0, 0, 0, 0] },
      },
      PAST,
      TODAY,
    );
    expect(hr.facts.find((f) => f.kind === "intensity")).toMatchObject({
      source: "hr",
      builtAround: 2,
      mostZone: 3,
      inPlanPct: 33,
    });
    const none = deviation({ minutes: 60, structure: EASY }, { minutes: 30 }, PAST, TODAY);
    expect(kinds(none.facts)).toEqual(["time"]);
  });

  it("never says a strength session had only a duration", () => {
    const d = deviation(
      { minutes: 45, structure: { kind: "strength", minutes: 45, exercises: [] } as never },
      { minutes: 20 },
      PAST,
      TODAY,
    );
    expect(kinds(d.facts)).toEqual(["time"]);
  });
});

describe("agreement with the colour", () => {
  const plannedMinutes = [0, 30, 60, 90];
  const plannedLoads = [null, 0, 40, 80];
  const doneMinutes = [0, 10, 30, 45, 59, 60, 75, 100, 150];
  const doneLoads = [null, 0, 20, 31, 40, 64, 100, 121];

  const cases: Array<[DeviationPlanned, { minutes: number; load: number | null }]> = [];
  for (const minutes of plannedMinutes)
    for (const load of plannedLoads)
      for (const dm of doneMinutes)
        for (const dl of doneLoads)
          cases.push([
            { minutes, load },
            { minutes: dm, load: dl },
          ]);

  it(`agrees in all ${cases.length} cases`, () => {
    for (const [planned, done] of cases) {
      const d = deviation(planned, done, PAST, TODAY);
      expect(d.colour).toBe(compliance(planned, done, PAST, TODAY));
      const off = d.colour === "yellow" || d.colour === "red";
      expect(d.heading !== null).toBe(off);
      if (!d.measuredBy) continue;
      // The fact the colour was read by gives back the colour, and its sign the direction.
      const measured = d.facts.find((f) => f.kind === (d.measuredBy === "load" ? "load" : "time"));
      expect(measured, JSON.stringify({ planned, done })).toBeDefined();
      const pct = (measured as { changePct: number }).changePct + 100;
      expect(colourOfPct(pct)).toBe(d.colour);
      if (off)
        expect(["shorter", "easier"].includes(d.heading!)).toBe(
          (measured as { changePct: number }).changePct < 0,
        );
    }
  });

  /**
   * The words agree too (the amendment of 13 October): the whole says
   * more exactly when the colour's ratio is over 100 %, and the ride's
   * effort never points the other way than a heading of harder or easier.
   */
  const methods = ["power", "hr", "rpe", "none"] as const;
  const worded: Array<[DeviationPlanned, Parameters<typeof deviation>[1]]> = [];
  for (const minutes of plannedMinutes)
    for (const load of plannedLoads)
      for (const dm of doneMinutes)
        for (const dl of doneLoads)
          for (const method of methods)
            worded.push([
              { minutes, load },
              { minutes: dm, load: dl, method },
            ]);

  it(`and its words agree in all ${worded.length} cases`, () => {
    for (const [planned, done] of worded) {
      const d = deviation(planned, done, PAST, TODAY);
      const label = JSON.stringify({ planned, done });
      expect(d.story, label).not.toBeNull();
      const story = d.story!;
      if (d.measuredBy === "load" && d.heading) {
        expect(story.whole, label).not.toBeNull();
        expect(story.whole!.direction === "less", label).toBe(
          ["shorter", "easier"].includes(d.heading),
        );
      } else expect(story.whole, label).toBeNull();
      // No effort word at all where either side has no load per hour to compare.
      if (d.heading === "harder" && story.ride.effort)
        expect(["harder", "muchHarder"], label).toContain(story.ride.effort);
      if (d.heading === "easier" && story.ride.effort)
        expect(["easier", "muchEasier"], label).toContain(story.ride.effort);
      // A share of threshold only where the load was measured by it.
      if (story.ride.intensityPct !== null) expect(["power", "hr"]).toContain(story.ride.method);
      if (story.thresholdHint !== null) expect(done!.minutes).toBeGreaterThanOrEqual(20);
    }
  });

  it("agrees for a missed session and for one still ahead", () => {
    for (const day of [PAST, TODAY, "2026-10-20"]) {
      const d = deviation({ minutes: 60 }, null, day, TODAY);
      expect(d.colour).toBe(compliance({ minutes: 60 }, null, day, TODAY));
      expect(d.heading).toBe(day < TODAY ? "missed" : null);
    }
  });
});
