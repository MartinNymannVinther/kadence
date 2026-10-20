import { describe, expect, it } from "vitest";
import {
  anchorDate,
  gridBounds,
  monthBounds,
  monthFrom,
  monthWeeks,
  scaleFrom,
  seasonBounds,
  seasonFrom,
  seasonLabel,
  seasonMonthKeys,
  seasonOfMonth,
  shiftMonth,
} from "@/modules/calendar/grid";

/**
 * The calendar's month and season as arithmetic (docs/adr/0093): weeks
 * Monday first, the edges of a month whatever weekday it starts on, and
 * a season from October to September.
 */

const weekday = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

describe("a month's weeks", () => {
  it("start on a Monday and end on a Sunday, every one of them", () => {
    for (const month of ["2026-10", "2026-11", "2027-02", "2028-02", "2026-03"]) {
      for (const week of monthWeeks(month)) {
        expect(week.days).toHaveLength(7);
        expect(weekday(week.monday)).toBe(1);
        expect(week.days[0]!.date).toBe(week.monday);
        expect(weekday(week.days[6]!.date)).toBe(0);
      }
    }
  });

  it("hold a month that starts on a Sunday in six rows, its 1st alone in the first", () => {
    // 1 November 2026 is a Sunday.
    const weeks = monthWeeks("2026-11");
    expect(weeks).toHaveLength(6);
    expect(weeks[0]!.monday).toBe("2026-10-26");
    expect(weeks[0]!.days.filter((d) => d.inMonth).map((d) => d.date)).toEqual(["2026-11-01"]);
    expect(weeks.at(-1)!.days.map((d) => d.date)).toContain("2026-11-30");
    expect(gridBounds("2026-11")).toEqual({ from: "2026-10-26", to: "2026-12-06" });
  });

  it("give February in a leap year its 29th", () => {
    const days = monthWeeks("2028-02")
      .flatMap((w) => w.days)
      .filter((d) => d.inMonth);
    expect(days).toHaveLength(29);
    expect(days.at(-1)!.date).toBe("2028-02-29");
    expect(monthBounds("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(monthBounds("2027-02").to).toBe("2027-02-28");
  });

  it("fit a February that starts on a Monday and is not a leap year in four rows", () => {
    // 1 February 2027 is a Monday.
    const weeks = monthWeeks("2027-02");
    expect(weeks).toHaveLength(4);
    expect(weeks.every((w) => w.days.every((d) => d.inMonth))).toBe(true);
  });

  it("mark the days of the months either side as outside", () => {
    const first = monthWeeks("2026-10")[0]!;
    expect(first.monday).toBe("2026-09-28");
    expect(first.days.slice(0, 3).every((d) => !d.inMonth)).toBe(true);
    expect(first.days[3]).toEqual({ date: "2026-10-01", inMonth: true });
  });
});

describe("months", () => {
  it("move across a year's turn both ways", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
    expect(shiftMonth("2026-10", 11)).toBe("2027-09");
    expect(shiftMonth("2026-10", -22)).toBe("2024-12");
  });

  it("come from the URL, or today's month when the URL says nothing sensible", () => {
    expect(monthFrom("2026-11", "2026-10-12")).toBe("2026-11");
    for (const bad of [undefined, "", "2026-13", "2026-1", "nov", "1999-12", "2026-11-01"])
      expect(monthFrom(bad, "2026-10-12")).toBe("2026-10");
  });
});

describe("a season", () => {
  it("runs from October to September", () => {
    expect(seasonMonthKeys(2026)).toEqual([
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
      "2027-04",
      "2027-05",
      "2027-06",
      "2027-07",
      "2027-08",
      "2027-09",
    ]);
    expect(seasonBounds(2026)).toEqual({ from: "2026-10-01", to: "2027-09-30" });
    expect(seasonOfMonth("2027-09")).toBe(2026);
    expect(seasonOfMonth("2027-10")).toBe(2027);
    expect(seasonLabel(2026)).toBe("2026/27");
    expect(seasonLabel(2099)).toBe("2099/00");
  });

  it("comes from the URL, or the season today is in", () => {
    expect(seasonFrom("2025", "2026-10-12")).toBe(2025);
    expect(seasonFrom(undefined, "2026-09-30")).toBe(2025);
    expect(seasonFrom("26", "2026-10-12")).toBe(2026);
    expect(seasonFrom("abcd", "2026-10-01")).toBe(2026);
  });
});

describe("the scale", () => {
  it("is the week unless the URL asks for the month or the year", () => {
    expect(scaleFrom("month")).toBe("month");
    expect(scaleFrom("year")).toBe("year");
    expect(scaleFrom("team")).toBe("week");
    expect(scaleFrom(undefined)).toBe("week");
  });

  it("opens the others on today when it is shown, else where the range starts", () => {
    expect(anchorDate({ from: "2026-10-12", to: "2026-10-18" }, "2026-10-14")).toBe("2026-10-14");
    // A week across a month's turn belongs to the month its Thursday is in.
    expect(anchorDate({ from: "2026-09-28", to: "2026-10-04" }, "2026-12-01")).toBe("2026-10-01");
    expect(anchorDate({ from: "2027-03-01", to: "2027-03-31" }, "2026-10-12")).toBe("2027-03-01");
  });
});
