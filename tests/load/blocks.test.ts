import { describe, expect, it } from "vitest";
import { blockWeeks, previewWeeks } from "@/modules/load/blocks";

/** A block's weeks summed from its items, and previewed against the guardrails. */

const templates = [
  { id: "long", sport: "bike", plannedMinutes: 180 },
  { id: "short", sport: "bike", plannedMinutes: 60 },
  { id: "gym", sport: "strength", plannedMinutes: 60 },
];
const items = [
  { day: 0, templateId: "gym" },
  { day: 1, templateId: "short" },
  { day: 2, templateId: "gym" },
  { day: 5, templateId: "long" },
  { day: 7, templateId: "gym" },
  { day: 12, templateId: "long" },
  { day: 13, templateId: "long" },
];

describe("a block's weeks", () => {
  it("sums each week's bike hours, strength sessions and their days", () => {
    const weeks = blockWeeks(2, items, templates);
    expect(weeks[0]).toMatchObject({
      week: 0,
      bikeHours: 4,
      strengthSessions: 2,
      sessions: 4,
      strengthDays: [0, 2],
    });
    expect(weeks[1]).toMatchObject({ week: 1, bikeHours: 6, strengthSessions: 1, sessions: 3 });
  });

  it("previews against the corridor, the ramp and the 48 hours, week by week", () => {
    const weeks = blockWeeks(2, [...items, { day: 8, templateId: "gym" }], templates);
    const corridor = { low: 8, target: 10, high: 12, breakDays: 0 };
    const preview = previewWeeks(weeks, "2026-11-02", () => corridor, [9, 9, 9, 9]);
    expect(preview[0]!.monday).toBe("2026-11-02");
    expect(preview[1]!.monday).toBe("2026-11-09");
    expect(preview[0]!.flags.map((f) => f.kind)).toContain("hours_below_corridor");
    // Week two's gym on Monday and Tuesday: 24 hours apart.
    expect(preview[1]!.flags.map((f) => f.kind)).toContain("strength_spacing");
  });

  it("flags a jump in the block's own second week, not only against the past", () => {
    const weeks = blockWeeks(
      2,
      [
        { day: 1, templateId: "short" },
        { day: 7, templateId: "long" },
        { day: 8, templateId: "long" },
        { day: 9, templateId: "long" },
      ],
      templates,
    );
    const preview = previewWeeks(weeks, "2026-11-02", () => null, [1, 1, 1, 1]);
    expect(preview[1]!.flags.map((f) => f.kind)).toContain("ramp");
  });
});
