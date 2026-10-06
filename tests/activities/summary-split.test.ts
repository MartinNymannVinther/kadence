import { describe, expect, it } from "vitest";
import { splitTiles } from "@/components/activities/summary-split";

/**
 * A ride's four first numbers (docs/adr/0062): time, distance, climbing
 * and the plan — or the average pulse without one — filled from the next
 * the ride has when one is missing; the rest go under "Mere data".
 */

const ALL = [
  "time",
  "elapsed",
  "distance",
  "plan",
  "avgSpeed",
  "maxSpeed",
  "ascent",
  "avgPower",
  "weightedPower",
  "maxPower",
  "avgHr",
  "maxHr",
  "drift",
  "cadence",
  "work",
  "load",
];

describe("the first four", () => {
  it("are time, distance, climbing and the plan for a planned ride", () => {
    const { first, rest } = splitTiles(ALL, true);
    expect(first).toEqual(["time", "distance", "ascent", "plan"]);
    expect(rest).toContain("avgHr");
    expect(rest).toContain("weightedPower");
    expect(rest).not.toContain("plan");
    expect([...first, ...rest].sort()).toEqual([...ALL].sort());
  });

  it("take the average pulse when nothing was planned", () => {
    const keys = ALL.filter((k) => k !== "plan");
    expect(splitTiles(keys, false).first).toEqual(["time", "distance", "ascent", "avgHr"]);
  });

  it("are filled from what the ride has when one is missing", () => {
    // A trainer ride: no distance, no climbing, no pulse.
    expect(splitTiles(["time", "avgPower", "load", "cadence"], false)).toEqual({
      first: ["time", "avgPower", "load"],
      rest: ["cadence"],
    });
    // A strength session ticked off by hand, planned.
    expect(splitTiles(["time", "plan", "load"], true)).toEqual({
      first: ["time", "plan", "load"],
      rest: [],
    });
  });
});
