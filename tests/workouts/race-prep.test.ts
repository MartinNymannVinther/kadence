import { describe, expect, it } from "vitest";
import { DCU_BIKE_SESSIONS } from "@/modules/dcu";
import { RACE_PREP, racePrepSession } from "@/modules/workouts/race-prep";
import { flattenSteps, structureMinutes } from "@/modules/workouts/structure";

/**
 * The race prep the day before a race (docs/adr/0106): DCU's "opladning",
 * an hour with one effort of five minutes at AT, the day before the race
 * in DCU's example week ("1*5 min. AT eller 1*3 max.", 1 t;
 * DCU_U17_kompendium_2016.pdf p. 14, DCU_U19_kompendium_2016.pdf p. 17).
 */

describe("the race prep", () => {
  it("is DCU's hour with one five-minute effort at AT, zone 4", () => {
    expect(structureMinutes(RACE_PREP.structure)).toBe(60);
    const hard = flattenSteps(RACE_PREP.structure).filter((s) => s.intent === "work");
    expect(hard).toEqual([
      { kind: "step", intent: "work", seconds: 300, target: { kind: "zone", zone: 4 } },
    ]);
  });

  it("is the same session as DCU's opener in Rulle, so the two never part", () => {
    const opener = DCU_BIKE_SESSIONS.find((s) => s.key === "dcu-opener")!;
    expect(RACE_PREP.structure).toBe(opener.structure);
    expect(opener.source).toContain("Opladning: 1*5 min. AT, 1 t");
  });

  it("speaks the reader's language, of threshold rather than AT", () => {
    expect(racePrepSession("da")).toMatchObject({
      sport: "bike",
      title: "Opladning før løbet",
      description: expect.stringContaining("5 minutter ved tærskel"),
    });
    expect(racePrepSession("en").title).toBe("Opener before the race");
    expect(racePrepSession("da").description).not.toContain("AT");
  });
});
