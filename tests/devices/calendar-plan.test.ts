import { describe, expect, it } from "vitest";
import {
  KEEP_PAST_DAYS,
  pastKeeping,
  planCalendar,
  type PlanRow,
  type PlanSession,
} from "@/modules/devices/calendar-plan";

/**
 * What the job does with one rider's Garmin calendar (docs/adr/0114,
 * 0115), before it calls anything: the bike sessions with steps from today
 * through the sixth day after go on, a workout whose session is gone,
 * changed sport or left the window comes off, and a workout sent ahead by
 * a press waits until the window reaches it. A workout whose day has
 * passed stays for three days, unless its session moved into the window,
 * and is then for the tidy. Pure.
 */

const TODAY = "2026-11-02";
const END = "2026-11-08";
const s = (id: string, onDate: string, sendable = true): PlanSession => ({ id, onDate, sendable });
const r = (id: string, plannedSessionId: string | null, scheduledOn: string): PlanRow => ({
  id,
  plannedSessionId,
  scheduledOn,
});
const plan = (sessions: PlanSession[], rows: PlanRow[]) =>
  planCalendar({ today: TODAY, end: END, sessions, rows }).map((step) =>
    step.action === "send"
      ? `send ${step.session.id}${step.row ? ` over ${step.row.id}` : ""}`
      : `remove ${step.row.id}`,
  );

describe("a rider's calendar, planned", () => {
  it("sends the bike sessions with steps from today through the sixth day after, in day order", () => {
    expect(
      plan(
        [
          s("sun", "2026-11-08"),
          s("yesterday", "2026-11-01"),
          s("mon", TODAY),
          s("next-mon", "2026-11-09"),
          s("gym", "2026-11-03", false),
        ],
        [],
      ),
    ).toEqual(["send mon", "send sun"]);
  });

  it("sends a session again over its own row, whatever changed", () => {
    expect(plan([s("a", "2026-11-04")], [r("ra", "a", "2026-11-03")])).toEqual(["send a over ra"]);
  });

  it("takes off a workout whose session is gone, changed sport or moved into the past", () => {
    expect(
      plan(
        [s("gym", "2026-11-04", false), s("back", "2026-11-01")],
        [r("gone", null, "2026-11-03"), r("rg", "gym", "2026-11-04"), r("rb", "back", TODAY)],
      ),
    ).toEqual(["remove rb", "remove gone", "remove rg"]);
  });

  it("takes off a workout whose session moved out of the window, and leaves one sent ahead", () => {
    expect(
      plan(
        [s("moved", "2026-11-12"), s("ahead", "2026-11-14")],
        [r("rm", "moved", "2026-11-05"), r("rahead", "ahead", "2026-11-14")],
      ),
    ).toEqual(["remove rm"]);
  });

  it("leaves a workout whose day has passed as it is, whatever became of its session", () => {
    expect(
      plan(
        [s("a", "2026-11-01"), s("gym", "2026-11-04", false), s("far", "2026-11-12")],
        [
          r("ra", "a", "2026-11-01"),
          r("gone", null, "2026-10-31"),
          r("rg", "gym", "2026-10-30"),
          r("rf", "far", "2026-10-20"),
        ],
      ),
    ).toEqual([]);
  });

  it("takes the workout along when its session moved from a day that has passed into the window", () => {
    expect(plan([s("moved", "2026-11-03")], [r("old", "moved", "2026-10-31")])).toEqual([
      "send moved over old",
    ]);
  });
});

describe("a rider's past days", () => {
  it("keeps three days after the day, and gives the rest to the tidy", () => {
    expect(KEEP_PAST_DAYS).toBe(3);
    const rows = [
      r("yesterday", "a", "2026-11-01"),
      r("three", "b", "2026-10-30"),
      r("four", "c", "2026-10-29"),
      r("old", null, "2026-09-01"),
      r("today", "d", TODAY),
    ];
    expect(pastKeeping(rows, TODAY).map((row) => row.id)).toEqual(["four", "old"]);
  });
});
