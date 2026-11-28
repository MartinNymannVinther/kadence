import { describe, expect, it } from "vitest";
import { patternLine, weekDraftPrompt } from "@/modules/assist/week-draft-prompt";

/** The week draft is told the patterns in a rider's changes, as codes and counts (docs/adr/0119). */
describe("patterns in the week draft", () => {
  const base = {
    monday: "2026-11-30",
    guided: true,
    category: "U19",
    basis: "U19-1",
    phase: "Distance",
    corridor: null,
    senior: null,
    strength: { min: 1, max: 2 },
    planned: [],
    events: [],
    recentWeeks: [],
    flags: [],
    templates: [],
  };

  it("names a weekday, a reason, long sessions and strength in one line each", () => {
    expect(patternLine({ key: "weekday", weekday: 1, count: 3, total: 4, reason: "school" })).toBe(
      'Tuesday sessions are often moved or skipped (3 of 4 changes, mostly "school")',
    );
    expect(patternLine({ key: "reason", reason: "tired", count: 3, total: 5 })).toBe(
      'the reason is mostly "tired" (3 of 5 changes)',
    );
    expect(patternLine({ key: "long", count: 3, total: 4 })).toContain("two hours or more");
    expect(patternLine({ key: "strength", count: 3, total: 4 })).toContain("strength sessions");
  });

  it("puts them in the prompt, and says none when there are none", () => {
    const [, withPatterns] = weekDraftPrompt(
      { ...base, patterns: [{ key: "long", count: 3, total: 4 }] },
      "da",
    );
    expect(withPatterns!.content).toContain(
      "Patterns in moved or skipped sessions: sessions of two hours",
    );
    const [, without] = weekDraftPrompt({ ...base, patterns: [] }, "da");
    expect(without!.content).toContain("Patterns in moved or skipped sessions: none.");
  });
});
