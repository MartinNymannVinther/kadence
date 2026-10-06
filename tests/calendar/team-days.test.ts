import { describe, expect, it } from "vitest";
import { cardDays, dayColour, weekMinutes } from "@/components/calendar/team-days";
import type { CalendarActivityCard, CalendarCard } from "@/components/calendar/types";

/**
 * The team's week on a phone (ADR 0062), without React: each rider's
 * seven days as compact chips — the sessions, how each went, one tint
 * for the day, and where a press leads — and the week's minutes for a
 * rider without a season bar.
 */

const DAYS = [
  "2026-11-02",
  "2026-11-03",
  "2026-11-04",
  "2026-11-05",
  "2026-11-06",
  "2026-11-07",
  "2026-11-08",
];
const TODAY = "2026-11-05"; // Thursday
const QUERY = { week: "2026-11-02", view: "team" as const };

function session(over: Partial<CalendarCard>): CalendarCard {
  return {
    id: "s",
    riderId: "r1",
    onDate: "2026-11-02",
    sport: "bike",
    title: "Z2",
    description: "",
    structure: null,
    plannedMinutes: 60,
    plannedLoad: null,
    plannedKm: null,
    startTime: null,
    meetingPlace: "",
    templateId: null,
    groupKey: null,
    seriesKey: null,
    programmeSession: null,
    activityId: null,
    activity: null,
    commentCount: 0,
    ...over,
  };
}

const ridden = (minutes: number) => ({ id: "a", movingSeconds: minutes * 60, load: null });

describe("a rider's days on the phone", () => {
  const sessions = [
    session({ id: "mon", onDate: "2026-11-02", activityId: "a1", activity: ridden(60) }),
    session({ id: "tue", onDate: "2026-11-03" }),
    session({ id: "wed-bike", onDate: "2026-11-04", activityId: "a2", activity: ridden(40) }),
    session({ id: "wed-gym", onDate: "2026-11-04", sport: "strength", title: "Styrke" }),
    session({ id: "thu", onDate: TODAY }),
    session({ id: "other", riderId: "r2", onDate: "2026-11-06" }),
  ];
  const days = cardDays("r1", DAYS, sessions, TODAY, QUERY);

  it("gives seven days with today marked", () => {
    expect(days.map((d) => d.date)).toEqual(DAYS);
    expect(days.filter((d) => d.isToday).map((d) => d.date)).toEqual([TODAY]);
  });

  it("says how each session went, and tints the day by the one that most wants a look", () => {
    expect(days[0]!.colour).toBe("green");
    expect(days[0]!.sessions[0]).toMatchObject({ id: "mon", colour: "green", done: true });
    expect(days[1]!.colour).toBe("red"); // planned, the day has passed, nothing done
    expect(days[2]!.sessions.map((s) => s.colour)).toEqual(["yellow", "red"]);
    expect(days[2]!.colour).toBe("red");
    expect(days[3]!.colour).toBe("grey"); // today, not missed until it is over
  });

  it("keeps another rider's sessions out, and an empty day leads nowhere", () => {
    expect(days[4]!.sessions).toEqual([]);
    expect(days[4]!.colour).toBeNull();
    expect(days[4]!.href).toBeNull();
  });

  it("opens one session's panel, and several the rider's week", () => {
    expect(days[0]!.href).toBe("/calendar?week=2026-11-02&view=team&session=mon");
    expect(days[2]!.href).toBe("/calendar?week=2026-11-02&rider=r1");
  });

  it("orders the colours missed first, as planned last", () => {
    expect(dayColour([])).toBeNull();
    expect(dayColour(["green", "none"])).toBe("none");
    expect(dayColour(["green", "grey"])).toBe("grey");
    expect(dayColour(["grey", "yellow", "green"])).toBe("yellow");
    expect(dayColour(["green", "red", "yellow"])).toBe("red");
  });
});

describe("a rider's week in minutes", () => {
  it("counts the calendar and what was ridden, a ride without a plan too", () => {
    const sessions = [
      session({ id: "a", plannedMinutes: 90, activity: ridden(80) }),
      session({ id: "b", plannedMinutes: 45 }),
      session({ id: "c", riderId: "r2", plannedMinutes: 300 }),
    ];
    const activities: CalendarActivityCard[] = [
      {
        id: "free",
        riderId: "r1",
        onDate: "2026-11-07",
        sport: "bike",
        title: "Tur",
        movingSeconds: 30 * 60,
        rpe: null,
        commentCount: 0,
      },
    ];
    expect(weekMinutes("r1", sessions, activities)).toEqual({ planned: 135, done: 110 });
    expect(weekMinutes("nobody", sessions, activities)).toEqual({ planned: 0, done: 0 });
  });
});
