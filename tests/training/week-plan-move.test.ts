import { describe, expect, it } from "vitest";
import { moveItem, moveTargets } from "@/components/week-plan/move";
import type { PlanItem } from "@/components/week-plan/types";

/**
 * Moving a session of the week plan to another day (ADR 0059, amended
 * 2026-10-12), as dragging and "Flyt til" both do it: the session takes
 * the new day and keeps everything else, the other sessions are left as
 * they were, and a drop on the day it is already on changes nothing.
 */

const template = (key: string, day: number, name: string): PlanItem => ({
  key,
  day,
  kind: "template",
  templateId: `tpl_${key}`,
  name,
  sport: "run",
  minutes: 45,
  startTime: "17:30",
  meetingPlace: "Klubhuset",
});

const WEEK: PlanItem[] = [
  template("a", 0, "Løbetur"),
  template("b", 1, "Intervaller"),
  template("c", 3, "Styrke"),
];

describe("moveItem", () => {
  it("puts the session on the new day with its time, place and template", () => {
    const moved = moveItem(WEEK, "a", 3);
    expect(moved.find((i) => i.key === "a")).toEqual({ ...WEEK[0], day: 3 });
  });

  it("leaves the other sessions as they were, and the plan given untouched", () => {
    const moved = moveItem(WEEK, "a", 3);
    expect(moved.filter((i) => i.key !== "a")).toEqual([WEEK[1], WEEK[2]]);
    expect(moved).toHaveLength(3);
    expect(WEEK[0]!.day).toBe(0);
  });

  it("adds the moved session after the day's others; the day shows them by time", () => {
    expect(moveItem(WEEK, "a", 3).map((i) => i.key)).toEqual(["b", "c", "a"]);
  });

  it("changes nothing for a drop on the same day, a session not there or a day outside the week", () => {
    expect(moveItem(WEEK, "b", 1)).toBe(WEEK);
    expect(moveItem(WEEK, "gone", 2)).toBe(WEEK);
    expect(moveItem(WEEK, "a", 7)).toBe(WEEK);
    expect(moveItem(WEEK, "a", -1)).toBe(WEEK);
  });

  it("is taken back by moving the session to the day it came from", () => {
    const back = moveItem(moveItem(WEEK, "b", 5), "b", 1);
    expect(back.find((i) => i.key === "b")).toEqual(WEEK[1]);
    expect(back.map((i) => i.day).sort()).toEqual(WEEK.map((i) => i.day).sort());
  });

  it("moves a session built in the planner the same way", () => {
    const built: PlanItem = {
      key: "x",
      day: 2,
      kind: "built",
      session: {
        sport: "bike",
        title: "Z2",
        description: "",
        structure: { kind: "bike", steps: [] },
        plannedMinutes: 90,
        plannedKm: null,
      },
    };
    expect(moveItem([built], "x", 6)).toEqual([{ ...built, day: 6 }]);
  });
});

describe("moveTargets", () => {
  it("offers the week's six other days, Monday first", () => {
    expect(moveTargets(0)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(moveTargets(3)).toEqual([0, 1, 2, 4, 5, 6]);
    expect(moveTargets(6)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("moves a session to each day it offers, and to nothing else", () => {
    for (const day of moveTargets(1)) expect(moveItem(WEEK, "b", day)).not.toBe(WEEK);
  });
});
