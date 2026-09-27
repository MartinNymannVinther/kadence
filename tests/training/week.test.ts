import { describe, expect, it } from "vitest";
import { weekDates, weekFrom } from "@/modules/training/week";

/** The calendar's week: the Monday a URL asks for, and its seven days. */

describe("the week a URL asks for", () => {
  it("is the Monday of the date it names", () => {
    expect(weekFrom("2026-10-01", "2026-09-27")).toBe("2026-09-28");
  });

  it("is this week when the URL names nothing sensible", () => {
    expect(weekFrom(undefined, "2026-09-27")).toBe("2026-09-21");
    expect(weekFrom("tomorrow", "2026-09-27")).toBe("2026-09-21");
    expect(weekFrom("2026-13-45", "2026-09-27")).toBe("2026-09-21");
  });

  it("has seven days from Monday", () => {
    expect(weekDates("2026-09-28")).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });
});
