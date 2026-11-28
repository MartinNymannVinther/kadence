import { describe, expect, it } from "vitest";
import { sessionShape, text } from "@/modules/mcp/shapes";
import type { CalendarSession } from "@/modules/training/sessions";

/** What a tool's answer carries (src/modules/mcp/shapes.ts, docs/adr/0118). Pure. */

const session = (source: string) =>
  ({
    id: "s1",
    onDate: "2026-11-27",
    startTime: null,
    sport: "bike",
    title: "Rolig tur",
    description: "",
    plannedMinutes: 90,
    plannedKm: null,
    plannedLoad: 60,
    meetingPlace: "",
    structure: null,
    commentCount: 0,
    activity: {
      id: "a1",
      movingSeconds: 5400,
      distanceM: 41234,
      load: 62.4,
      loadMethod: "power",
      rpe: 4,
      source,
    },
  }) as unknown as CalendarSession;

describe("a session's answer", () => {
  it("gives the ride's numbers in minutes and km", () => {
    expect(sessionShape(session("fit")).ridden).toEqual({
      minutes: 90,
      km: 41.2,
      load: 62,
      rpe: 4,
    });
  });

  it("keeps only that a ride from Garmin was ridden", () => {
    expect(sessionShape(session("garmin")).ridden).toEqual({ fromGarmin: true });
  });
});

describe("a person's own words", () => {
  it("are capped and lose control characters", () => {
    expect(text("a\u0000b\u0007c", 10)).toBe("abc");
    expect(text("x".repeat(50), 10)).toHaveLength(10);
    expect(text(null)).toBe("");
  });
});
