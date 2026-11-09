import { describe, expect, it } from "vitest";
import { monthCells, teamMonthDays } from "@/components/calendar/month-days";
import type {
  CalendarActivityCard,
  CalendarCard,
  CalendarEventCard,
} from "@/components/calendar/types";
import { monthWeeks } from "@/modules/calendar/grid";

/**
 * The month views' days without React (docs/adr/0093): a rider's day
 * with its sessions in the load model's colours, the rides without a
 * plan and the events over it, and where a press leads; the team's days
 * as marks.
 */

const TODAY = "2026-11-12";

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

const ride = (over: Partial<CalendarActivityCard>): CalendarActivityCard => ({
  id: "a",
  riderId: "r1",
  onDate: "2026-11-03",
  sport: "bike",
  name: { word: "afternoonRide" },
  movingSeconds: 3600,
  rpe: null,
  attribution: null,
  commentCount: 0,
  ...over,
});

const event = (over: Partial<CalendarEventCard>): CalendarEventCard => ({
  id: "e",
  riderId: null,
  kind: "race",
  title: "Løb",
  startsOn: "2026-11-07",
  endsOn: "2026-11-08",
  priority: null,
  note: "",
  startTime: null,
  meetingPlace: "",
  transportNote: "",
  source: null,
  fromParent: false,
  ...over,
});

const input = {
  sessions: [
    session({
      id: "done",
      onDate: "2026-11-02",
      activityId: "x",
      activity: {
        id: "x",
        movingSeconds: 3600,
        load: null,
        loadMethod: "none",
        rpe: null,
        attribution: null,
      },
    }),
    session({ id: "missed", onDate: "2026-11-04" }),
    session({ id: "ahead-1", onDate: "2026-11-20" }),
    session({ id: "ahead-2", onDate: "2026-11-20", sport: "strength" }),
    session({ id: "teammate", riderId: "r2", onDate: "2026-11-04" }),
  ],
  activities: [ride({ id: "free" }), ride({ id: "theirs", riderId: "r2" })],
  events: [event({ id: "race" })],
};

describe("a rider's month", () => {
  const weeks = monthCells("r1", monthWeeks("2026-11"), input, TODAY, {
    view: "month",
    month: "2026-11",
    rider: "r1",
  });
  const cell = (date: string) => weeks.flatMap((w) => w.cells).find((c) => c.date === date)!;

  it("is drawn in the month's weeks, the edges included", () => {
    expect(weeks).toHaveLength(6);
    expect(cell("2026-10-31").inMonth).toBe(false);
    expect(cell("2026-11-12").isToday).toBe(true);
  });

  it("colours each session as the week does", () => {
    expect(cell("2026-11-02").sessions.map((s) => s.colour)).toEqual(["green"]);
    expect(cell("2026-11-04").sessions.map((s) => [s.id, s.colour])).toEqual([["missed", "red"]]);
    expect(cell("2026-11-20").sessions.map((s) => s.colour)).toEqual(["grey", "grey"]);
  });

  it("shows the rides without a session and the events on each of their days", () => {
    expect(cell("2026-11-03").rides.map((r) => r.id)).toEqual(["free"]);
    expect(cell("2026-11-07").events).toEqual([
      { id: "race", kind: "race", title: "Løb", first: true },
    ]);
    expect(cell("2026-11-08").events[0]!.first).toBe(false);
  });

  it("opens one session's panel in the month, and takes any other day to its week", () => {
    expect(cell("2026-11-04").href).toBe(
      "/calendar?month=2026-11&rider=r1&view=month&session=missed",
    );
    expect(cell("2026-11-20").href).toBe("/calendar?week=2026-11-16&rider=r1#day-2026-11-20");
    expect(cell("2026-11-01").href).toBe("/calendar?week=2026-10-26&rider=r1#day-2026-11-01");
  });
});

describe("a rider's row in the team's month", () => {
  const days = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-07"];
  const row = teamMonthDays("r1", days, input, TODAY);

  it("marks each session and ride of the rider's own, and nothing of a teammate's", () => {
    expect(row.map((d) => d.marks.map((m) => m.colour))).toEqual([
      ["green"],
      ["none"],
      ["red"],
      [],
      [],
    ]);
    expect(row[2]!.colour).toBe("red");
    expect(row[3]!.colour).toBeNull();
  });

  it("marks the team's race, and leads only from a day with something on it", () => {
    expect(row[4]!.race).toBe("Løb");
    expect(row[4]!.href).toBe("/calendar?week=2026-11-02&rider=r1#day-2026-11-07");
    expect(row[3]!.href).toBeNull();
  });

  it("marks another rider's own race only on that rider's row", () => {
    const own = { ...input, events: [event({ id: "r2-race", riderId: "r2", title: "Hans løb" })] };
    expect(teamMonthDays("r1", ["2026-11-07"], own, TODAY)[0]!.race).toBeNull();
    expect(teamMonthDays("r2", ["2026-11-07"], own, TODAY)[0]!.race).toBe("Hans løb");
  });
});
