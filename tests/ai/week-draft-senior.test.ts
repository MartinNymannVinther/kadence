import { describe, expect, it } from "vitest";
import { weekDraftPrompt, type WeekDraftContext } from "@/modules/assist/week-draft-prompt";

/**
 * "Foreslå ugen" told about a senior (docs/adr/0091): an adult on Kadence's
 * own profile with the month's hours and the profile's corridor, no DCU
 * class and no DCU race rules; a U19 rider is told DCU's, as before.
 */

const base: WeekDraftContext = {
  monday: "2026-11-02",
  guided: true,
  category: "senior",
  basis: "senior-motionist",
  phase: "distance — volume first",
  corridor: { low: 2.99, target: 3.73, high: 4.48 },
  senior: { profile: "motionist", monthHours: 16 },
  strength: { min: 2, max: 2 },
  planned: [],
  events: [],
  recentWeeks: [3.5, 4],
  flags: [],
  templates: [],
};

const text = (c: WeekDraftContext) =>
  weekDraftPrompt(c, "da")
    .map((m) => m.content)
    .join("\n");

describe("the week draft's prompt for a senior", () => {
  it("names the profile and the month's hours, and no DCU class", () => {
    const prompt = text(base);
    expect(prompt).toContain(
      "The rider is a senior on the Motionist profile, about 16 hours on the bike this month.",
    );
    expect(prompt).toContain("Motionist bike hours this week: target 3.7, corridor 3.0–4.5.");
    expect(prompt).toContain("adult recreational rider");
    expect(prompt).toContain("No DCU race rules for this class.");
    expect(prompt).not.toContain(
      "Cycling Denmark's (DCU) recommendations for the rider's age class",
    );
    expect(prompt).not.toContain("DCU bike hours");
    expect(prompt).not.toContain("16-year-old");
  });

  it("names a supermotionist as one", () => {
    const prompt = text({
      ...base,
      basis: "senior-super-motionist",
      senior: { profile: "super-motionist", monthHours: 62 },
    });
    expect(prompt).toContain("on the Supermotionist profile, about 62 hours");
  });

  it("tells a U19 rider DCU's hours and race rules as before", () => {
    const prompt = text({ ...base, category: "U19", basis: "U19-1", senior: null });
    expect(prompt).toContain("Class: U19 (U19-1). DCU phase:");
    expect(prompt).toContain("DCU bike hours this week: target 3.7");
    expect(prompt).toContain("DCU race rules for U19");
    expect(prompt).toContain("16-year-old");
  });

  it("tells nothing of a profile when the team plans without a paradigm", () => {
    const prompt = text({ ...base, guided: false, corridor: null });
    expect(prompt).toContain("The team sets its own hours.");
    expect(prompt).not.toContain("Motionist");
  });
});
