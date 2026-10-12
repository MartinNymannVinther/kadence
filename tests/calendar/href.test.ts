import { describe, expect, it } from "vitest";
import { calendarHref, riderHref, scaleHref, teamHref } from "@/components/calendar/href";

/**
 * The calendar's addresses at three scales (docs/adr/0093): every link
 * keeps the others' choices, and the team's week keeps the address older
 * links use.
 */

describe("calendarHref", () => {
  it("writes the week as before", () => {
    expect(calendarHref({ week: "2026-11-02", view: "team" })).toBe(
      "/calendar?week=2026-11-02&view=team",
    );
    expect(calendarHref({ week: "2026-11-02", rider: "r1", session: "s1" })).toBe(
      "/calendar?week=2026-11-02&rider=r1&session=s1",
    );
  });

  it("writes the month and the season, the team's with team=1", () => {
    expect(calendarHref({ view: "month", month: "2026-11", rider: "r1" })).toBe(
      "/calendar?month=2026-11&rider=r1&view=month",
    );
    expect(calendarHref({ view: "year", year: 2026, team: true })).toBe(
      "/calendar?year=2026&view=year&team=1",
    );
  });

  it("leaves out what belongs to another scale", () => {
    expect(
      calendarHref({
        view: "month",
        month: "2026-11",
        week: "2026-11-02",
        year: 2026,
        rider: "r1",
      }),
    ).toBe("/calendar?month=2026-11&rider=r1&view=month");
  });

  it("keeps the session open on a month", () => {
    expect(calendarHref({ view: "month", month: "2026-11", rider: "r1", session: "s1" })).toBe(
      "/calendar?month=2026-11&rider=r1&view=month&session=s1",
    );
  });
});

describe("switching scale", () => {
  const today = "2026-10-14";

  it("keeps the rider, and opens on today when today is shown", () => {
    const week = { week: "2026-10-12", rider: "r1" };
    const shown = { from: "2026-10-12", to: "2026-10-18" };
    expect(scaleHref(week, "month", shown, today)).toBe(
      "/calendar?month=2026-10&rider=r1&view=month",
    );
    expect(scaleHref(week, "year", shown, today)).toBe("/calendar?year=2026&rider=r1&view=year");
  });

  it("keeps the team", () => {
    const month = { view: "month" as const, month: "2027-03", team: true };
    const shown = { from: "2027-03-01", to: "2027-03-31" };
    expect(scaleHref(month, "week", shown, today)).toBe("/calendar?week=2027-03-01&view=team");
    expect(scaleHref(month, "year", shown, today)).toBe("/calendar?year=2026&view=year&team=1");
  });

  it("drops an open session", () => {
    const query = { week: "2026-10-12", rider: "r1", session: "s1" };
    expect(scaleHref(query, "month", { from: "2026-10-12", to: "2026-10-18" }, today)).not.toMatch(
      /session/,
    );
  });
});

describe("choosing whose calendar", () => {
  it("keeps the scale and the place", () => {
    const month = { view: "month" as const, month: "2026-11", rider: "r1" };
    expect(teamHref(month)).toBe("/calendar?month=2026-11&view=month&team=1");
    expect(riderHref({ view: "year", year: 2026, team: true }, "r2")).toBe(
      "/calendar?year=2026&rider=r2&view=year",
    );
    expect(teamHref({ week: "2026-11-02", rider: "r1" })).toBe(
      "/calendar?week=2026-11-02&view=team",
    );
    expect(riderHref({ week: "2026-11-02", view: "team" }, "r2")).toBe(
      "/calendar?week=2026-11-02&rider=r2",
    );
  });
});
