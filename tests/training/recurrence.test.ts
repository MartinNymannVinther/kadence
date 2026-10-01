import { describe, expect, it } from "vitest";
import {
  isoWeekday,
  MAX_REPEAT_WEEKS,
  RepeatInput,
  repeatDates,
  repeatProblem,
  strengthNotes,
} from "@/modules/training/recurrence";

/**
 * "Gentag" (ADR 0041) as pure logic: which days a series falls on, when
 * it cannot be made, and what the guardrails would say about a strength
 * series before it is — DCU's 48 hours and its sessions a week.
 */

const TUE_THU = { weekdays: [2, 4], until: "2026-11-30" };

describe("the days of a series", () => {
  it("are the chosen weekdays from the first day to the last, both included", () => {
    expect(isoWeekday("2026-11-03")).toBe(2);
    expect(repeatDates("2026-11-03", TUE_THU)).toEqual([
      "2026-11-03",
      "2026-11-05",
      "2026-11-10",
      "2026-11-12",
      "2026-11-17",
      "2026-11-19",
      "2026-11-24",
      "2026-11-26",
    ]);
  });

  it("leave out the first day when its weekday is not chosen", () => {
    expect(repeatDates("2026-11-02", { weekdays: [4], until: "2026-11-12" })).toEqual([
      "2026-11-05",
      "2026-11-12",
    ]);
  });

  it("read the weekdays as a set, in order", () => {
    expect(RepeatInput.parse({ weekdays: [4, 2, 4], until: "2026-11-30" }).weekdays).toEqual([
      2, 4,
    ]);
    expect(RepeatInput.safeParse({ weekdays: [], until: "2026-11-30" }).success).toBe(false);
    expect(RepeatInput.safeParse({ weekdays: [8], until: "2026-11-30" }).success).toBe(false);
  });
});

describe("a series that cannot be made", () => {
  it("ends before it starts, runs past half a year, or holds no day", () => {
    expect(repeatProblem("2026-11-03", { weekdays: [2], until: "2026-11-02" })).toBe("order");
    expect(repeatProblem("2026-11-03", { weekdays: [2], until: "2027-05-04" })).toBe("tooLong");
    expect(repeatProblem("2026-11-03", { weekdays: [5], until: "2026-11-05" })).toBe("empty");
    expect(repeatProblem("2026-11-03", TUE_THU)).toBeNull();
    const last = new Date(Date.UTC(2026, 10, 3 + MAX_REPEAT_WEEKS * 7 - 1)).toISOString();
    expect(repeatProblem("2026-11-03", { weekdays: [2], until: last.slice(0, 10) })).toBeNull();
  });
});

describe("what the guardrails say about a strength series", () => {
  it("nothing for Tuesday and Thursday in the winter's build", () => {
    expect(strengthNotes("2026-11-03", TUE_THU)).toEqual([]);
  });

  it("that two days less than 48 hours apart are too close", () => {
    expect(strengthNotes("2026-11-03", { weekdays: [2, 3], until: "2026-11-30" })).toEqual([
      { kind: "close", first: 2, second: 3 },
    ]);
    // Sunday and Monday are neighbours across the week's turn.
    expect(strengthNotes("2026-11-02", { weekdays: [1, 4, 7], until: "2026-11-30" })[0]).toEqual({
      kind: "close",
      first: 7,
      second: 1,
    });
  });

  it("that two a week is more than DCU's one after mid-March", () => {
    expect(strengthNotes("2027-03-02", { weekdays: [2, 4], until: "2027-04-30" })).toEqual([
      { kind: "tooMany", from: "2027-03-22", perWeek: 2, max: 1 },
    ]);
  });
});
