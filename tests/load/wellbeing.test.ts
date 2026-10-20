import { describe, expect, it } from "vitest";
import { addDaysIso } from "@/core/dates";
import { checkinZone, isRedCheckin, wellbeingStatus, type Checkin } from "@/modules/load/wellbeing";

const TODAY = "2026-09-27";

const good: Checkin = {
  sleepHours: 8.5,
  sleepQuality: 4,
  energy: 4,
  mood: 4,
  soreness: 4,
  stress: 4,
  pain: 0,
  ill: 0,
};
const yellow: Checkin = { ...good, energy: 1 };
const red: Checkin = { ...good, ill: 1 };

/** Check-ins keyed by date, `daysAgo` counted back from today. */
function byDate(entries: [daysAgo: number, checkin: Checkin][]): Record<string, Checkin> {
  return Object.fromEntries(entries.map(([ago, c]) => [addDaysIso(TODAY, -ago), c]));
}

/** A check-in every day from `from` to `to` days ago, yellow on the days `isBad` picks. */
function daily(from: number, to: number, isBad: (ago: number) => boolean) {
  const entries: [number, Checkin][] = [];
  for (let ago = from; ago >= to; ago--) entries.push([ago, isBad(ago) ? yellow : good]);
  return entries;
}

describe("one check-in's zone", () => {
  it("is green when all is well", () => {
    expect(checkinZone(good)).toEqual({ zone: "green", signs: [] });
  });

  it("is red for pain 3, illness or the lowest mood", () => {
    expect(checkinZone({ ...good, pain: 3 })).toEqual({ zone: "red", signs: ["pain"] });
    expect(checkinZone(red)).toEqual({ zone: "red", signs: ["ill"] });
    expect(checkinZone({ ...good, mood: 1 })).toEqual({ zone: "red", signs: ["mood"] });
    expect(checkinZone({ ...good, pain: 3, ill: 1 }).signs).toEqual(["ill", "pain"]);
  });

  it("is red by the one rule red_since and the coach's reminder share", () => {
    expect(isRedCheckin({ ...good, pain: 3 })).toBe(true);
    expect(isRedCheckin(red)).toBe(true);
    expect(isRedCheckin({ ...good, mood: 1 })).toBe(true);
    expect(isRedCheckin({ ...good, pain: 2 })).toBe(false);
    expect(isRedCheckin(yellow)).toBe(false);
    expect(isRedCheckin(good)).toBe(false);
  });

  it("is yellow for pain 2 or an answer at the bottom", () => {
    expect(checkinZone({ ...good, pain: 2 })).toEqual({ zone: "yellow", signs: ["pain"] });
    expect(checkinZone(yellow)).toEqual({ zone: "yellow", signs: ["low_answer"] });
    expect(checkinZone({ ...good, pain: 1 }).zone).toBe("green");
  });

  it("is yellow when the answers average 2.5 or lower, with at least three answered", () => {
    const low = { pain: 0, ill: 0, sleepQuality: 2, energy: 3, mood: 2, soreness: 3 };
    expect(checkinZone(low)).toEqual({ zone: "yellow", signs: ["low_average"] });
    expect(checkinZone({ ...low, stress: 3 }).zone).toBe("green"); // 2.6
    expect(checkinZone({ pain: 0, ill: 0, mood: 2, energy: 2 }).zone).toBe("green");
  });

  it("is yellow for a night under 6 hours", () => {
    expect(checkinZone({ ...good, sleepHours: 5.9 })).toEqual({
      zone: "yellow",
      signs: ["short_sleep"],
    });
    expect(checkinZone({ ...good, sleepHours: 6 }).zone).toBe("green");
  });
});

describe("the status over three weeks", () => {
  it("has no zone without a check-in this week", () => {
    expect(wellbeingStatus({}, TODAY)).toEqual({
      zone: null,
      yellowDays: 0,
      since: null,
      action: "none",
      signs: [],
    });
    const old = wellbeingStatus(byDate([[10, yellow]]), TODAY);
    expect(old.zone).toBeNull();
    expect(old.yellowDays).toBe(1);
  });

  it("stays green through a few hard days in a week", () => {
    const one = wellbeingStatus(byDate(daily(6, 0, (ago) => ago === 2)), TODAY);
    expect(one).toMatchObject({ zone: "green", action: "none", yellowDays: 1, since: null });
    const three = wellbeingStatus(byDate(daily(6, 0, (ago) => ago < 3)), TODAY);
    expect(three.zone).toBe("green");
  });

  it("asks for a talk when half the week or more is yellow", () => {
    const status = wellbeingStatus(byDate(daily(6, 0, (ago) => ago < 4)), TODAY);
    expect(status).toEqual({
      zone: "yellow",
      yellowDays: 4,
      since: addDaysIso(TODAY, -3),
      action: "talk",
      signs: ["low_answer"],
    });
  });

  it("still asks for a talk after two yellow weeks", () => {
    const status = wellbeingStatus(byDate(daily(20, 0, (ago) => ago < 14)), TODAY);
    expect(status).toMatchObject({ zone: "yellow", action: "talk", yellowDays: 14 });
    expect(status.since).toBe(addDaysIso(TODAY, -13));
  });

  it("escalates to help after three yellow weeks in a row", () => {
    const status = wellbeingStatus(byDate(daily(20, 0, () => true)), TODAY);
    expect(status).toMatchObject({ zone: "yellow", action: "help", yellowDays: 21 });
    expect(status.since).toBe(addDaysIso(TODAY, -20));
  });

  it("escalates for a rider who checks in once a week, too", () => {
    const weekly = byDate([
      [0, yellow],
      [7, yellow],
      [14, yellow],
    ]);
    expect(wellbeingStatus(weekly, TODAY)).toMatchObject({ action: "help", yellowDays: 3 });
  });

  it("does not bridge a week without check-ins", () => {
    const gap = byDate([
      [0, yellow],
      [14, yellow],
    ]);
    expect(wellbeingStatus(gap, TODAY)).toMatchObject({ zone: "yellow", action: "talk" });
  });

  it("asks for help at once for a red check-in", () => {
    const status = wellbeingStatus(byDate([...daily(6, 1, () => false), [0, red]]), TODAY);
    expect(status).toEqual({
      zone: "red",
      yellowDays: 1,
      since: TODAY,
      action: "help",
      signs: ["ill"],
    });
  });

  it("lets a red check-in go after a green week", () => {
    const status = wellbeingStatus(byDate([[8, red], ...daily(6, 0, () => false)]), TODAY);
    expect(status).toMatchObject({ zone: "green", action: "none", yellowDays: 1 });
  });

  it("ignores check-ins dated after today", () => {
    const status = wellbeingStatus(
      byDate([
        [0, good],
        [-1, red],
      ]),
      TODAY,
    );
    expect(status.zone).toBe("green");
  });
});
