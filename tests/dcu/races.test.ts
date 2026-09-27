import { describe, expect, it } from "vitest";
import { RACE_RULES, raceDays, raceRulesFor, stageRaceTooLong } from "@/modules/dcu";

/**
 * DCU's race limits by class (Sporstlige_regler_2026): each number
 * checked against the PDF's text, paragraph by paragraph.
 */
describe("DCU's race rules 2026", () => {
  it("U17: 80 km road, 15 km time trial, 7.33 m gearing, 4 stage days (§ 1.15, § 23.4-1)", () => {
    expect(RACE_RULES.U17).toMatchObject({
      roadMaxKm: 80,
      timeTrialMaxKm: 15,
      gearingM: 7.33,
      stageRaceMaxDays: 4,
    });
  });

  it("U19 men: 90–140 km road, 30 km time trial, no gear limit (§ 1.6-5, 1.6-6)", () => {
    expect(RACE_RULES.U19.men).toMatchObject({
      roadMinKm: 90,
      roadMaxKm: 140,
      timeTrialMaxKm: 30,
      gearingM: null,
      stageRaceMaxDays: 4,
    });
  });

  it("U19 women: 60–95 km road, 30 km time trial (§ 1.14-5, 1.14-6)", () => {
    expect(RACE_RULES.U19.women).toMatchObject({
      roadMinKm: 60,
      roadMaxKm: 95,
      timeTrialMaxKm: 30,
    });
  });

  it("U23: stage races up to 5 days (§ 23.4-3)", () => {
    expect(RACE_RULES.U23.stageRaceMaxDays).toBe(5);
  });

  it("names a paragraph and a page for every rule", () => {
    for (const rules of [RACE_RULES.U17, RACE_RULES.U19.men, RACE_RULES.U19.women, RACE_RULES.U23])
      expect(rules.source).toMatch(/Sporstlige_regler_2026 .*PDF p\. \d+/);
  });

  it("looks U19 up by sex, and falls back to the men's longer distances", () => {
    expect(raceRulesFor("U19", "female").roadMaxKm).toBe(95);
    expect(raceRulesFor("U19", "male").roadMaxKm).toBe(140);
    expect(raceRulesFor("U19", null).roadMaxKm).toBe(140);
    expect(raceRulesFor("U17", "female").roadMaxKm).toBe(80);
  });

  it("counts a race's days with both ends, and flags a stage race too long for the class", () => {
    expect(raceDays("2026-06-04", "2026-06-04")).toBe(1);
    expect(raceDays("2026-06-04", "2026-06-08")).toBe(5);
    expect(stageRaceTooLong("U17", { startsOn: "2026-06-04", endsOn: "2026-06-07" })).toBe(false);
    expect(stageRaceTooLong("U19", { startsOn: "2026-06-04", endsOn: "2026-06-08" })).toBe(true);
    expect(stageRaceTooLong("U23", { startsOn: "2026-06-04", endsOn: "2026-06-08" })).toBe(false);
  });
});
