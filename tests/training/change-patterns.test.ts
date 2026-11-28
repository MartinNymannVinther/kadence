import { describe, expect, it } from "vitest";
import {
  changeSummary,
  countedChanges,
  weekdayOf,
  type ChangeFact,
} from "@/modules/training/change-patterns";

/** Patterns in a rider's moved and skipped sessions (docs/adr/0119). */

const TODAY = "2026-11-27"; // a Friday

const change = (over: Partial<ChangeFact>): ChangeFact => ({
  plannedSessionId: null,
  kind: "skipped",
  fromDate: "2026-11-24",
  reason: null,
  byRole: "rider",
  changedOn: "2026-11-24",
  sport: "bike",
  plannedMinutes: 60,
  ...over,
});

/** Tuesdays back from 24 November. */
const tuesdays = ["2026-11-24", "2026-11-17", "2026-11-10", "2026-11-03"];

describe("which changes count", () => {
  it("counts the rider's own, and a coach's only close to the day", () => {
    const counted = countedChanges(
      [
        change({ byRole: "rider" }),
        change({ byRole: "coach", changedOn: "2026-11-22" }),
        change({ byRole: "coach", changedOn: "2026-10-01" }),
      ],
      TODAY,
    );
    expect(counted).toHaveLength(2);
  });

  it("forgets a skip taken back, and anything older than eight weeks", () => {
    const counted = countedChanges(
      [
        change({ plannedSessionId: "a" }),
        change({ plannedSessionId: "a", kind: "unskipped" }),
        change({ fromDate: "2026-09-01", changedOn: "2026-09-01" }),
      ],
      TODAY,
    );
    expect(counted).toEqual([]);
  });
});

describe("the patterns", () => {
  it("finds the weekday, with the reason behind it", () => {
    const summary = changeSummary(
      [
        ...tuesdays.slice(0, 3).map((d) => change({ fromDate: d, changedOn: d, reason: "school" })),
        change({
          fromDate: "2026-11-20",
          changedOn: "2026-11-20",
          kind: "moved",
          reason: "weather",
        }),
      ],
      TODAY,
    );
    expect(weekdayOf("2026-11-24")).toBe(1);
    expect(summary.patterns).toContainEqual({
      key: "weekday",
      weekday: 1,
      count: 3,
      total: 4,
      reason: "school",
    });
    expect(summary.patterns).toContainEqual({
      key: "reason",
      reason: "school",
      count: 3,
      total: 4,
    });
    expect(summary).toMatchObject({ moved: 1, skipped: 3 });
    expect(summary.reasons).toEqual([
      { reason: "school", count: 3 },
      { reason: "weather", count: 1 },
    ]);
  });

  it("finds long sessions and strength among most changes", () => {
    const summary = changeSummary(
      [
        ...tuesdays.map((d, i) =>
          change({ fromDate: addDays(d, i), changedOn: addDays(d, i), plannedMinutes: 150 }),
        ),
      ],
      TODAY,
    );
    expect(summary.patterns).toContainEqual({ key: "long", count: 4, total: 4 });
    const gym = changeSummary(
      tuesdays.map((d, i) =>
        change({ fromDate: addDays(d, i), changedOn: addDays(d, i), sport: "strength" }),
      ),
      TODAY,
    );
    expect(gym.patterns).toContainEqual({ key: "strength", count: 4, total: 4 });
  });

  it("calls nothing a pattern with fewer than three changes", () => {
    const summary = changeSummary(
      tuesdays.slice(0, 2).map((d) => change({ fromDate: d, changedOn: d, reason: "ill" })),
      TODAY,
    );
    expect(summary.patterns).toEqual([]);
  });
});

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
