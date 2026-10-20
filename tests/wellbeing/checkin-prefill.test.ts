import { describe, expect, it } from "vitest";
import { addDaysIso } from "@/core/dates";
import { checkinZone } from "@/modules/load/wellbeing";
import {
  checkinStart,
  lowBehindMore,
  NEUTRAL_SCALE,
  type CheckinAnswers,
} from "@/modules/wellbeing/prefill";

/**
 * The shorter check-in (backlog P2-11; ADR 0021, amended 2026-10-07): the
 * three questions asked first start blank every day, and the answers
 * behind "Mere" start from the rider's last check-in, or in the middle of
 * each scale and not ill when there is none — so a check-in of three taps
 * and "Gem" saves a whole row, and its zone is the same rule as ever.
 */

const TODAY = "2026-11-10";

const yesterday: CheckinAnswers = {
  sleepHours: 7.5,
  sleepQuality: 4,
  energy: 2,
  mood: 5,
  soreness: 2,
  stress: 4,
  pain: 2,
  painWhere: "Højre knæ",
  usualPains: [{ id: "kp_back", place: "Ryg", level: 2 }],
  ill: 0,
  note: "Eksamen i morgen",
};

const blankFirst = { sleepHours: null, energy: null, pain: 0, painWhere: "", usualPains: [] };

describe("checkinStart", () => {
  it("starts in the middle of every scale, not ill and without a note, when there is no check-in", () => {
    expect(checkinStart(null, TODAY)).toEqual({
      from: "neutral",
      answers: {
        ...blankFirst,
        sleepQuality: NEUTRAL_SCALE,
        mood: NEUTRAL_SCALE,
        soreness: NEUTRAL_SCALE,
        stress: NEUTRAL_SCALE,
        ill: 0,
        note: "",
      },
    });
  });

  it("takes yesterday's answers behind Mere, and asks the three first ones afresh", () => {
    expect(checkinStart({ onDate: addDaysIso(TODAY, -1), answers: yesterday }, TODAY)).toEqual({
      from: "last",
      answers: {
        ...blankFirst,
        sleepQuality: 4,
        mood: 5,
        soreness: 2,
        stress: 4,
        ill: 0,
        // A note is about its own day.
        note: "",
      },
    });
  });

  it("carries being ill over, for the rider to change", () => {
    const ill = { ...yesterday, ill: 1 };
    expect(checkinStart({ onDate: addDaysIso(TODAY, -1), answers: ill }, TODAY).answers.ill).toBe(
      1,
    );
  });

  it("puts a scale left unanswered last time in the middle", () => {
    const partial = { ...yesterday, mood: null, stress: null };
    const { answers } = checkinStart({ onDate: addDaysIso(TODAY, -2), answers: partial }, TODAY);
    expect([answers.mood, answers.stress]).toEqual([NEUTRAL_SCALE, NEUTRAL_SCALE]);
  });

  it("takes the last check-in within the model's three weeks, and none older", () => {
    const at = (daysAgo: number) =>
      checkinStart({ onDate: addDaysIso(TODAY, -daysAgo), answers: yesterday }, TODAY).from;
    expect(at(21)).toBe("last");
    expect(at(22)).toBe("neutral");
    // Today's own is not a last check-in; the form edits it instead.
    expect(at(0)).toBe("neutral");
  });
});

describe("lowBehindMore", () => {
  it("opens Mere by itself when an answer behind it is low or says ill", () => {
    const start = (answers: CheckinAnswers) =>
      lowBehindMore(checkinStart({ onDate: addDaysIso(TODAY, -1), answers }, TODAY).answers);
    expect(start(yesterday)).toBe(true); // soreness 2
    expect(start({ ...yesterday, soreness: 3 })).toBe(false);
    expect(start({ ...yesterday, soreness: 3, ill: 1 })).toBe(true);
    expect(start({ ...yesterday, soreness: 3, mood: 1 })).toBe(true);
    // Energy is asked first, so a low one yesterday opens nothing today.
    expect(start({ ...yesterday, soreness: 3, energy: 1 })).toBe(false);
    expect(lowBehindMore(checkinStart(null, TODAY).answers)).toBe(false);
  });
});

describe("a check-in of three answers and Gem", () => {
  const quick = (first: Partial<CheckinAnswers>, last: CheckinAnswers | null = null) => {
    const start = checkinStart(last && { onDate: addDaysIso(TODAY, -1), answers: last }, TODAY);
    return { ...start.answers, ...first };
  };

  it("saves a whole row: every scale answered", () => {
    const row = quick({ sleepHours: 8, energy: 4 });
    for (const key of ["sleepQuality", "energy", "mood", "soreness", "stress"] as const)
      expect(row[key]).not.toBeNull();
  });

  it("gets its zone by the same rule as ever, from every answer", () => {
    expect(checkinZone(quick({ sleepHours: 8, energy: 4 })).zone).toBe("green");
    expect(checkinZone(quick({ sleepHours: 8, energy: 1 }))).toEqual({
      zone: "yellow",
      signs: ["low_answer"],
    });
    expect(checkinZone(quick({ sleepHours: 5.5, energy: 4 }))).toEqual({
      zone: "yellow",
      signs: ["short_sleep"],
    });
    expect(checkinZone(quick({ sleepHours: 8, energy: 4, pain: 3 }))).toEqual({
      zone: "red",
      signs: ["pain"],
    });
    // The answers carried from yesterday count too: low legs and mood pull the average down.
    const hard = { ...yesterday, sleepQuality: 2, mood: 2, soreness: 2, stress: 2 };
    expect(checkinZone(quick({ sleepHours: 8, energy: 3 }, hard))).toEqual({
      zone: "yellow",
      signs: ["low_average"],
    });
  });
});
