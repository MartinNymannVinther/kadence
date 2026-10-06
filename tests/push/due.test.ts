import { describe, expect, it } from "vitest";
import {
  copenhagenClock,
  decide,
  isQuiet,
  kindsFor,
  lastTold,
  planWindow,
  type Facts,
  type SubscriptionState,
} from "@/modules/push/due";

/**
 * When a reminder is due (docs/adr/0060), in Copenhagen time: the
 * check-in from 19.00, news since the last reminder, the parents' week on
 * Sunday from 18.00, nothing in the quiet hours from 21.30 to 7.00, one
 * reminder at a time, and only what the person chose.
 *
 * Tuesday 6 October 2026 is summer time (UTC+2); Sunday 1 November is
 * winter time (UTC+1).
 */

const TUESDAY = "2026-10-06";
const at = (iso: string) => new Date(iso);
/** 19.05 on Tuesday in Copenhagen. */
const EVENING = at("2026-10-06T17:05:00Z");

const ALL = ["checkin", "comment", "plan", "week"];
const sub = (over: Partial<SubscriptionState> = {}): SubscriptionState => ({
  kinds: ALL,
  toldUpTo: at("2026-10-06T08:00:00Z"),
  checkinRemindedOn: null,
  weekToldOn: null,
  ...over,
});
const rider = (over: Partial<Facts> = {}): Facts => ({
  isRider: true,
  checkedInToday: false,
  isParent: false,
  newestComment: null,
  newestPlanChange: null,
  ...over,
});
const parent = (over: Partial<Facts> = {}): Facts =>
  rider({ isRider: false, isParent: true, ...over });

describe("Copenhagen's clock", () => {
  it("reads the day, the minute and the weekday across summer and winter time", () => {
    expect(copenhagenClock(at("2026-10-06T17:00:00Z"))).toEqual({
      date: TUESDAY,
      minutes: 19 * 60,
      weekday: 2,
    });
    expect(copenhagenClock(at("2026-11-01T17:00:00Z"))).toEqual({
      date: "2026-11-01",
      minutes: 18 * 60,
      weekday: 7,
    });
    // 23.30 UTC on Monday is already Tuesday in Copenhagen.
    expect(copenhagenClock(at("2026-10-05T23:30:00Z")).date).toBe(TUESDAY);
  });

  it("keeps quiet from 21.30 to 7.00", () => {
    const quiet = (utc: string) => isQuiet(copenhagenClock(at(utc)));
    expect(quiet("2026-10-06T19:29:00Z")).toBe(false); // 21.29
    expect(quiet("2026-10-06T19:30:00Z")).toBe(true); // 21.30
    expect(quiet("2026-10-07T04:59:00Z")).toBe(true); // 6.59
    expect(quiet("2026-10-07T05:00:00Z")).toBe(false); // 7.00
  });

  it("counts the plan's seven days from today", () => {
    expect(planWindow(TUESDAY)).toEqual({ from: TUESDAY, to: "2026-10-12" });
  });
});

describe("which reminders a person is offered", () => {
  it("follows the roles on the team", () => {
    const none = { isCoach: false, isRider: false, isParent: false };
    expect(kindsFor({ ...none, isRider: true })).toEqual(["checkin", "comment", "plan"]);
    expect(kindsFor({ ...none, isCoach: true })).toEqual(["comment"]);
    expect(kindsFor({ ...none, isParent: true })).toEqual(["comment", "week"]);
    expect(kindsFor({ isCoach: true, isRider: true, isParent: true })).toEqual(ALL);
    expect(kindsFor(none)).toEqual([]);
  });
});

describe("the evening check-in", () => {
  it("is due from 19.00 for a rider who has not checked in, once a day", () => {
    expect(decide(sub(), rider(), at("2026-10-06T16:59:00Z"))).toBeNull();
    expect(decide(sub(), rider(), EVENING)).toEqual({
      kind: "checkin",
      mark: { slot: "checkin", checkinRemindedOn: TUESDAY },
    });
    expect(decide(sub({ checkinRemindedOn: TUESDAY }), rider(), EVENING)).toBeNull();
    // Yesterday's reminder does not stand in for today's.
    expect(decide(sub({ checkinRemindedOn: "2026-10-05" }), rider(), EVENING)?.kind).toBe(
      "checkin",
    );
  });

  it("is not due after the check-in, for someone who does not ride, when unchosen, or late", () => {
    expect(decide(sub(), rider({ checkedInToday: true }), EVENING)).toBeNull();
    expect(decide(sub(), parent(), EVENING)).toBeNull();
    expect(decide(sub({ kinds: ["comment", "plan"] }), rider(), EVENING)).toBeNull();
    expect(decide(sub(), rider(), at("2026-10-06T19:45:00Z"))).toBeNull(); // 21.45
  });
});

describe("news: comments and changes to the plan", () => {
  const comment = at("2026-10-06T10:00:00Z");
  const plan = at("2026-10-06T11:00:00Z");
  const noon = at("2026-10-06T12:00:00Z");

  it("tells a comment newer than the last reminder, and moves the mark to now", () => {
    expect(decide(sub(), rider({ newestComment: comment }), noon)).toEqual({
      kind: "comment",
      mark: { slot: "news", toldUpTo: noon },
    });
    expect(
      decide(
        sub({ toldUpTo: at("2026-10-06T10:30:00Z") }),
        rider({ newestComment: comment }),
        noon,
      ),
    ).toBeNull();
  });

  it("tells whichever came last when both are new", () => {
    expect(
      decide(sub(), rider({ newestComment: comment, newestPlanChange: plan }), noon)?.kind,
    ).toBe("plan");
    expect(
      decide(sub(), rider({ newestComment: plan, newestPlanChange: comment }), noon)?.kind,
    ).toBe("comment");
  });

  it("respects the person's choice, and the plan is a rider's", () => {
    expect(
      decide(sub({ kinds: ["checkin", "plan"] }), rider({ newestComment: comment }), noon),
    ).toBeNull();
    expect(decide(sub({ kinds: ["comment"] }), rider({ newestPlanChange: plan }), noon)).toBeNull();
    expect(decide(sub(), parent({ newestPlanChange: plan }), noon)).toBeNull();
  });

  it("comes before the check-in when both are due; the check-in waits for the next run", () => {
    expect(decide(sub(), rider({ newestComment: comment }), EVENING)?.mark.slot).toBe("news");
  });

  it("waits through the quiet hours", () => {
    expect(decide(sub(), rider({ newestComment: comment }), at("2026-10-06T21:00:00Z"))).toBeNull();
  });
});

describe("the parents' week", () => {
  const sunday = (utc: string) => at(`2026-11-01T${utc}Z`);

  it("is due on Sunday from 18.00, once a week", () => {
    expect(decide(sub(), parent(), sunday("16:59:00"))).toBeNull(); // 17.59
    expect(decide(sub(), parent(), sunday("17:00:00"))).toEqual({
      kind: "week",
      mark: { slot: "week", weekToldOn: "2026-10-26" },
    });
    expect(decide(sub({ weekToldOn: "2026-10-26" }), parent(), sunday("17:30:00"))).toBeNull();
  });

  it("is not due on other days, for a rider, or when unchosen", () => {
    expect(decide(sub(), parent(), at("2026-10-31T17:30:00Z"))).toBeNull(); // Saturday
    expect(decide(sub(), rider({ checkedInToday: true }), sunday("17:30:00"))).toBeNull();
    expect(decide(sub({ kinds: ["comment"] }), parent(), sunday("17:30:00"))).toBeNull();
  });
});

describe("what was told last", () => {
  it("reads news, the check-in or the week back from the marks", () => {
    const pushed = at("2026-10-06T17:05:00Z");
    expect(lastTold({ ...sub({ toldUpTo: pushed }), updatedAt: pushed })).toBe("news");
    expect(lastTold({ ...sub({ checkinRemindedOn: TUESDAY }), updatedAt: pushed })).toBe("checkin");
    const sunday = at("2026-11-01T17:10:00Z");
    expect(lastTold({ ...sub({ weekToldOn: "2026-10-26" }), updatedAt: sunday })).toBe("week");
    expect(lastTold({ ...sub(), updatedAt: pushed })).toBeNull();
  });
});
