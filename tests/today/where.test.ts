import { describe, expect, it } from "vitest";
import { coverShown, meElsewhere, todayElsewhere } from "@/components/today/where";
import { clockOf, timePlaceText } from "@/components/today/time-place";

/**
 * Where a person lands, and two small things Today and the parents' page
 * show (docs/adr/0063): a parent who is nothing else has their Today on
 * /parents; Mig is a rider's; the club's picture is for an empty day; and
 * a session's time and place read as one short line.
 */

const child = { guardianId: "g", riderId: "r", name: "Emma", confirmed: true };
const rider = { id: "r", name: "Emma", birthYear: 2009 };
const parent = { isCoach: false, rider: null, children: [child] };
const coach = { isCoach: true, rider: null, children: [] };
const riderOnly = { isCoach: false, rider, children: [] };

describe("Today", () => {
  it("sends a parent who is nothing else to the child's page", () => {
    expect(todayElsewhere(parent)).toBe("/parents");
    // Waiting for the child's yes is still a parent's page.
    expect(todayElsewhere({ ...parent, children: [{ ...child, confirmed: false }] })).toBe(
      "/parents",
    );
  });

  it("keeps a coach, a rider, someone who is both, and someone who is none", () => {
    expect(todayElsewhere(coach)).toBeNull();
    expect(todayElsewhere(riderOnly)).toBeNull();
    expect(todayElsewhere({ ...coach, children: [child] })).toBeNull();
    expect(todayElsewhere({ ...riderOnly, children: [child] })).toBeNull();
    expect(todayElsewhere({ isCoach: false, rider: null, children: [] })).toBeNull();
    expect(todayElsewhere(null)).toBeNull();
  });
});

describe("Mig", () => {
  it("is a rider's, a coach's who rides too included", () => {
    expect(meElsewhere(riderOnly)).toBeNull();
    expect(meElsewhere({ ...coach, rider })).toBeNull();
  });

  it("sends everyone else to their own front page", () => {
    expect(meElsewhere(coach)).toBe("/today");
    expect(meElsewhere(parent)).toBe("/parents");
    expect(meElsewhere({ ...coach, children: [child] })).toBe("/today");
    expect(meElsewhere(null)).toBe("/today");
  });
});

describe("the club's picture", () => {
  it("shows on an empty day only", () => {
    expect(coverShown({ sessionsToday: 0, waiting: false })).toBe(true);
    expect(coverShown({ sessionsToday: 1, waiting: false })).toBe(false);
    expect(coverShown({ sessionsToday: 0, waiting: true })).toBe(false);
  });
});

describe("time and place", () => {
  it("writes the time the way each language does", () => {
    expect(clockOf("17:30:00", "da")).toBe("17.30");
    expect(clockOf("17:30:00", "en")).toBe("17:30");
    expect(clockOf("7:05", "da")).toBe("07.05");
    expect(clockOf(null, "da")).toBeNull();
    expect(clockOf("", "da")).toBeNull();
  });

  it("joins what there is, and says nothing without either", () => {
    expect(timePlaceText({ startTime: "17:30:00", meetingPlace: "Klubhuset" }, "da")).toBe(
      "17.30 · Klubhuset",
    );
    expect(timePlaceText({ startTime: null, meetingPlace: " Klubhuset " }, "da")).toBe("Klubhuset");
    expect(timePlaceText({ startTime: "09:00:00", meetingPlace: "" }, "en")).toBe("09:00");
    expect(timePlaceText({}, "da")).toBeNull();
  });
});
