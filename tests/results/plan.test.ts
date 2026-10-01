import { describe, expect, it } from "vitest";
import { parseDcuProfile } from "@/modules/results/dcu-profile";
import { planImport, titleFor, type PlanEvent } from "@/modules/results/plan";
import { PAGE, UCI } from "./profile-fixture";

const results = parseDcuProfile(PAGE, UCI).results;
const base = {
  riderId: "r1",
  results,
  events: [] as PlanEvent[],
  known: new Map(),
  since: "2025-01-01",
};

describe("where the results go in the calendar", () => {
  it("makes one race a day for the days the calendar has none, from the season before on", () => {
    const plan = planImport(base);
    expect(plan.newRaces).toEqual([
      { on: "2025-06-15", title: "Future Racing 2025" },
      { on: "2026-06-21", title: "Amager CR - Vitamin Well Grand Prix 2026" },
      { on: "2026-07-30", title: "CAMPIONE HOLSTEBRO TOURS 2026" },
      { on: "2026-08-30", title: "B&U DM Linjeløb - Vejle CK 2026" },
      { on: "2026-09-06", title: "Greve CC 2026" },
      { on: "2026-09-13", title: "Demin Cup Finalen 2026 - Holbæk CS" },
    ]);
    // 2023 is before the season before: not placed at all.
    expect(plan.results).toHaveLength(7);
    expect(
      plan.results.filter((r) => "newOn" in r.event && r.event.newOn === "2026-07-30"),
    ).toHaveLength(2);
  });

  it("puts a result on the race already in the calendar that day, the rider's own before the team's", () => {
    const events: PlanEvent[] = [
      { id: "team", riderId: null, kind: "race", startsOn: "2026-09-06", endsOn: "2026-09-06" },
      { id: "own", riderId: "r1", kind: "race", startsOn: "2026-09-06", endsOn: "2026-09-06" },
      { id: "tour", riderId: null, kind: "race", startsOn: "2026-07-29", endsOn: "2026-08-02" },
      { id: "exam", riderId: "r1", kind: "exam", startsOn: "2026-09-13", endsOn: "2026-09-13" },
      { id: "other", riderId: "r2", kind: "race", startsOn: "2026-08-30", endsOn: "2026-08-30" },
    ];
    const plan = planImport({ ...base, events });
    const on = (ref: string) => plan.results.find((r) => r.sourceRef === ref)!.event;
    expect(on("17614:101512")).toEqual({ id: "own" });
    expect(on("19086:110561")).toEqual({ id: "tour" });
    expect(on("19292:111229")).toEqual({ id: "tour" });
    // An exam is not a race, and another rider's race is not this rider's.
    expect(on("17626:101613")).toEqual({ newOn: "2026-09-13" });
    expect(on("17480:100581")).toEqual({ newOn: "2026-08-30" });
    expect(plan.newRaces.map((r) => r.on)).not.toContain("2026-07-30");
  });

  it("keeps a result read before on the race it hung on", () => {
    const plan = planImport({ ...base, known: new Map([["17614:101512", "kept"]]) });
    expect(plan.results.find((r) => r.sourceRef === "17614:101512")!.event).toEqual({ id: "kept" });
    expect(plan.newRaces.map((r) => r.on)).not.toContain("2026-09-06");
  });
});

describe("a day's title", () => {
  it("is what the day's races share when that says something", () => {
    expect(
      titleFor([
        "CAMPIONE HOLSTEBRO TOURS 2026 -3. ETAPE - Landevejsløb/Road Race",
        "CAMPIONE HOLSTEBRO TOURS 2026 -2. ETAPE - Landevejsløb/Road Race",
      ]),
    ).toBe("CAMPIONE HOLSTEBRO TOURS 2026");
    expect(titleFor(["Youth Tour 2026 2. Etape", "Youth Tour 2026 3. Etape"])).toBe(
      "Youth Tour 2026",
    );
  });

  it("is the first race when they share too little, or share half a word", () => {
    expect(titleFor(["Youth Tour 2026 1. Etape", "Etapeløb Youth Tour - ENTRY"])).toBe(
      "Youth Tour 2026 1. Etape",
    );
    expect(titleFor(["Etapeløbet Syd", "Etapeløb Nord"])).toBe("Etapeløbet Syd");
  });

  it("fits the calendar's 120 characters", () => {
    expect(titleFor(["x".repeat(300)])).toHaveLength(120);
  });
});
