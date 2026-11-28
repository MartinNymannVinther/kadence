import { describe, expect, it } from "vitest";
import { anyRideShape, sessionShape, text } from "@/modules/mcp/shapes";
import type { RecentRide } from "@/modules/today/recent-rides";
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

  it("keeps of a ride from Garmin only that it was ridden, and how hard the rider says it was", () => {
    expect(sessionShape(session("garmin")).ridden).toEqual({ fromGarmin: true, rpe: 4 });
  });
});

const ride = (source: string, planned: boolean) =>
  ({
    id: "a1",
    onDate: "2026-11-27",
    startedAt: new Date("2026-11-27T08:00:00Z"),
    sport: "bike",
    name: { title: "Rolig tur" },
    movingSeconds: 5400,
    distanceM: 41234,
    rpe: 6,
    feel: 3,
    note: "Tunge ben",
    load: 62.4,
    source,
    deviceName: "Edge 1030 Plus",
    planned,
  }) as unknown as RecentRide;

describe("a ride from Garmin (ADR 0118, amended 28 November)", () => {
  it("carries the rider's own part and the planned session, never Garmin's numbers", () => {
    const shown = anyRideShape(ride("garmin", true));
    expect(shown).toEqual({
      id: "a1",
      fromGarmin: true,
      planned: true,
      date: "2026-11-27",
      title: "Rolig tur",
      rpe: 6,
      feel: 3,
      note: "Tunge ben",
    });
    for (const key of ["minutes", "km", "load", "deviceName", "startedAt"])
      expect(shown).not.toHaveProperty(key);
  });

  it("has no day when nobody planned it, since the day is Garmin's", () => {
    expect(anyRideShape(ride("garmin", false))).toMatchObject({ date: null, title: "" });
  });

  it("is shown in full when it came from anywhere else", () => {
    expect(anyRideShape(ride("fit", false))).toMatchObject({ minutes: 90, km: 41.2, load: 62 });
  });
});

describe("a person's own words", () => {
  it("are capped and lose control characters", () => {
    expect(text("a\u0000b\u0007c", 10)).toBe("abc");
    expect(text("x".repeat(50), 10)).toHaveLength(10);
    expect(text(null)).toBe("");
  });
});
