import { describe, expect, it } from "vitest";
import da from "../../messages/da.json";
import en from "../../messages/en.json";
import { COACH_SOURCES, GUIDE_SECTIONS, guideValues } from "@/modules/coach";
import { FLAG_SECTION } from "@/modules/coach/flag-sections";
import { RACE_RULES } from "@/modules/dcu";

/**
 * The coach guide holds together: every section has its words in both
 * languages, exactly as many points as it says, real sources, and the
 * numbers in its words come from the modules that own them.
 */

type Sections = Record<string, { title: string; intro: string; points: Record<string, string> }>;

describe("the coach guide", () => {
  for (const [lang, messages] of [
    ["da", da],
    ["en", en],
  ] as const) {
    const sections = (messages as unknown as { coachGuide: { sections: Sections } }).coachGuide
      .sections;

    it(`has every section's words in ${lang}, point for point`, () => {
      expect(Object.keys(sections).sort()).toEqual(GUIDE_SECTIONS.map((s) => s.id).sort());
      for (const section of GUIDE_SECTIONS) {
        const words = sections[section.id]!;
        expect(words.title.length).toBeGreaterThan(3);
        expect(words.intro.length).toBeGreaterThan(20);
        expect(Object.keys(words.points)).toHaveLength(section.points);
      }
    });

    it(`fills every placeholder in ${lang} from the modules' numbers`, () => {
      const values = guideValues();
      const text = JSON.stringify(sections);
      for (const [, name] of text.matchAll(/\{(\w+)\}/g)) expect(values).toHaveProperty(name!);
    });
  }

  it("cites real sources, over https, for every section", () => {
    for (const section of GUIDE_SECTIONS) {
      expect(section.sources.length).toBeGreaterThan(0);
      for (const id of section.sources) expect(COACH_SOURCES[id].url).toMatch(/^https:\/\//);
    }
  });

  it("takes the race numbers from DCU's rules, not from its own words", () => {
    expect(guideValues()).toMatchObject({
      u17Road: RACE_RULES.U17.roadMaxKm,
      u17Gear: RACE_RULES.U17.gearingM,
      u19wMax: RACE_RULES.U19.women.roadMaxKm,
      u23Stage: RACE_RULES.U23.stageRaceMaxDays,
    });
  });

  it("points every guardrail flag at a section that exists", () => {
    const ids = new Set(GUIDE_SECTIONS.map((s) => s.id));
    for (const section of Object.values(FLAG_SECTION)) expect(ids.has(section)).toBe(true);
  });
});
