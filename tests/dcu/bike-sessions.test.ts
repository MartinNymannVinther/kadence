import { describe, expect, it } from "vitest";
import { DCU_BIKE_SESSIONS, INTERVAL_FORMS } from "@/modules/dcu";
import { rideableStructure } from "@/modules/rulle/rideable";
import { bikeStructureSchema, structureMinutes } from "@/modules/workouts/structure";

const byKey = (key: string) => DCU_BIKE_SESSIONS.find((s) => s.key === key)!;

describe("DCU's interval forms as sessions to ride", () => {
  it("are valid, rideable sessions with keys of their own and a source each", () => {
    expect(new Set(DCU_BIKE_SESSIONS.map((s) => s.key)).size).toBe(DCU_BIKE_SESSIONS.length);
    for (const session of DCU_BIKE_SESSIONS) {
      expect(bikeStructureSchema.parse(session.structure)).toEqual(session.structure);
      expect(rideableStructure("bike", session.structure)).not.toBeNull();
      expect(session.source.length).toBeGreaterThan(10);
      expect(session.name.da && session.name.en && session.when.da && session.when.en).toBeTruthy();
    }
  });

  it("ride DCU's own examples, from its interval sheet", () => {
    const example = (form: string, written: string) =>
      expect(INTERVAL_FORMS.find((f) => f.form === form)!.examples).toContain(written);
    example("Medium", "2*15");
    example("AT", "3*8");
    example("VO2 max", "3*3");
    example("Anaerob kap.", "10*30/30");
    example("spurt", "5*10 sek");
  });

  it("say when DCU puts them in a season, in DCU's words", () => {
    expect(byKey("dcu-medium-2x15").when.da).toBe("Fra december/januar");
    expect(byKey("dcu-at-3x8").when.da).toBe("Fra december/januar");
    expect(byKey("dcu-vo2-3x3").when.da).toBe("2 måneder før formtop");
    expect(byKey("dcu-anaerobic-10x30").when.da).toBe("4-6 uger før formtop");
    expect(byKey("dcu-sprint-5x10").when.da).toBe("2 måneder før formtop");
  });

  it("last about an hour, the opener half of it", () => {
    const minutes = Object.fromEntries(
      DCU_BIKE_SESSIONS.map((s) => [s.key, structureMinutes(s.structure)]),
    );
    expect(minutes).toEqual({
      "dcu-base-60": 60,
      "dcu-medium-2x15": 65,
      "dcu-at-3x8": 61,
      "dcu-vo2-3x3": 48,
      "dcu-anaerobic-10x30": 45,
      "dcu-sprint-5x10": 55,
      "dcu-opener": 30,
    });
  });

  it("ride a sprint freely, all out, rather than in ERG", () => {
    const sprint = byKey("dcu-sprint-5x10").structure.steps[1]!;
    expect(sprint.kind === "repeat" && sprint.steps[0]!.target).toEqual({ kind: "open" });
  });
});
