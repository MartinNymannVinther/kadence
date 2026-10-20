import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import {
  nextMonday,
  nextWeekLine,
  nextWeekSummary,
  type NextWeekWords,
} from "@/components/today/next-week";
import { weekdayLong } from "@/components/training/day-label";
import da from "../../messages/da.json";
import en from "../../messages/en.json";

/**
 * Overblik's first card: whether next week is planned — for nobody, for
 * some of the riders or for all of them — and what is in it that the plan
 * goes around, said as one sentence in the reader's language. Weeks are
 * the ISO weeks Danish calendars use, also where a year ends.
 */

/** As the card words it (src/components/today/next-week-card.tsx). */
function wordsFor(locale: "da" | "en"): NextWeekWords {
  const t = createTranslator({
    locale,
    messages: locale === "da" ? da : en,
    namespace: "today.nextWeek",
  });
  const list = new Intl.ListFormat(locale === "en" ? "en-GB" : "da-DK", { type: "conjunction" });
  return {
    riders: (kind, count) => t("riders", { kind, count }),
    team: (kind, days) => t("team", { kind, days }),
    day: (iso) => t("day", { day: weekdayLong(iso, locale) }),
    span: (from, to) => t("span", { from: weekdayLong(from, locale), to: weekdayLong(to, locale) }),
    list: (items) => list.format(items),
    and: t("and"),
    locale,
  };
}

// Today is Friday 9 October 2026, in week 41; next week is week 42.
const TODAY = "2026-10-09";
const MONDAY = "2026-10-12";
const riders = ["emma", "oskar", "freja", "magnus", "ida", "noah"].map((id) => ({ id }));
const session = (riderId: string, onDate = "2026-10-13") => ({ riderId, onDate });
const event = (
  kind: string,
  riderId: string | null,
  startsOn: string,
  endsOn: string = startsOn,
) => ({ kind, riderId, startsOn, endsOn });

describe("next week", () => {
  it("is the Monday after this week", () => {
    expect(nextMonday(TODAY)).toBe(MONDAY);
    expect(nextMonday("2026-10-12")).toBe("2026-10-19");
    expect(nextMonday("2026-10-18")).toBe("2026-10-19");
  });

  it("is not planned while no rider has a session in it", () => {
    const summary = nextWeekSummary({
      monday: MONDAY,
      riders,
      // This week's and the week after's sessions are not next week's.
      sessions: [session("emma", "2026-10-11"), session("emma", "2026-10-19")],
      events: [],
    });
    expect(summary).toMatchObject({ week: 42, state: "none", sessions: 0, planned: 0 });
    expect(summary.riders).toBe(6);
  });

  it("is planned for some when some riders have sessions, each rider counted once", () => {
    const summary = nextWeekSummary({
      monday: MONDAY,
      riders,
      sessions: [
        session("emma"),
        session("emma", "2026-10-15"),
        session("oskar", "2026-10-18"),
        session("freja", "2026-10-12"),
        // A rider no longer on the team is not one of the six.
        session("archived"),
      ],
      events: [],
    });
    expect(summary).toMatchObject({ state: "some", sessions: 4, planned: 3, riders: 6 });
  });

  it("is planned when every rider has a session", () => {
    const summary = nextWeekSummary({
      monday: MONDAY,
      riders,
      sessions: riders.flatMap((r) => [session(r.id), session(r.id, "2026-10-17")]),
      events: [],
    });
    expect(summary).toMatchObject({ state: "all", sessions: 12, planned: 6, riders: 6 });
  });

  it("counts the riders by the kind of their own days, and the team's by the days", () => {
    const { kinds } = nextWeekSummary({
      monday: MONDAY,
      riders,
      sessions: [],
      events: [
        event("holiday", "emma", "2026-10-10", "2026-10-18"),
        event("holiday", "oskar", "2026-10-12", "2026-10-16"),
        // Two entries for one rider are one rider.
        event("holiday", "oskar", "2026-10-17"),
        event("exam", "freja", "2026-10-14"),
        event("race", null, "2026-10-17"),
        // The same race entered twice is said once.
        event("race", null, "2026-10-17"),
        // A camp that runs past Sunday is said up to Sunday.
        event("camp", null, "2026-10-16", "2026-10-20"),
        // Neither another week's, an archived rider's nor "other" counts.
        event("exam", "freja", "2026-10-19"),
        event("ill", "archived", "2026-10-13"),
        event("other", null, "2026-10-13"),
      ],
    });
    expect(kinds).toEqual([
      { kind: "holiday", riders: 2, team: [] },
      { kind: "exam", riders: 1, team: [] },
      { kind: "camp", riders: 0, team: [{ from: "2026-10-16", to: "2026-10-18" }] },
      { kind: "race", riders: 0, team: [{ from: "2026-10-17", to: "2026-10-17" }] },
    ]);
  });
});

describe("the week in one sentence", () => {
  const summary = (events: ReturnType<typeof event>[]) =>
    nextWeekSummary({ monday: MONDAY, riders, sessions: [], events }).kinds;

  it("says the riders' days first and the team's after, joined as Danish joins clauses", () => {
    const kinds = summary([
      event("holiday", "emma", "2026-10-12", "2026-10-18"),
      event("holiday", "oskar", "2026-10-12", "2026-10-18"),
      event("race", null, "2026-10-17"),
    ]);
    expect(nextWeekLine(kinds, wordsFor("da"))).toBe("2 ryttere har ferie, og der er løb lørdag.");
    expect(nextWeekLine(kinds, wordsFor("en"))).toBe(
      "2 riders are on holiday, and there is a race on Saturday.",
    );
  });

  it("names a span of days and several days, and a lone clause stands alone", () => {
    expect(
      nextWeekLine(summary([event("camp", null, "2026-10-16", "2026-10-18")]), wordsFor("da")),
    ).toBe("Der er lejr fredag til søndag.");
    expect(
      nextWeekLine(
        summary([event("race", null, "2026-10-17"), event("race", null, "2026-10-18")]),
        wordsFor("en"),
      ),
    ).toBe("There is a race on Saturday and on Sunday.");
  });

  it("counts one rider in the singular, and lists three clauses with commas", () => {
    const kinds = summary([
      event("ill", "ida", "2026-10-12", "2026-10-13"),
      event("exam", "freja", "2026-10-14"),
      event("ill", "noah", "2026-10-15"),
      event("race", null, "2026-10-18"),
    ]);
    expect(nextWeekLine(kinds, wordsFor("da"))).toBe(
      "1 rytter har eksamen, 2 ryttere er syge, og der er løb søndag.",
    );
    expect(nextWeekLine(kinds, wordsFor("en"))).toBe(
      "1 rider has an exam, 2 riders are ill, and there is a race on Sunday.",
    );
  });

  it("is nothing when the week holds nothing a plan goes around", () => {
    expect(nextWeekLine([], wordsFor("da"))).toBeNull();
  });
});

describe("week numbers where a year ends", () => {
  it("follow the ISO weeks Danish calendars use", () => {
    // 2026 has 53 weeks: the last starts Monday 28 December.
    expect(
      nextWeekSummary({ monday: nextMonday("2026-12-23"), riders, sessions: [], events: [] }),
    ).toMatchObject({ monday: "2026-12-28", week: 53 });
    // Week 1 of 2027 starts Monday 4 January.
    expect(
      nextWeekSummary({ monday: nextMonday("2026-12-31"), riders, sessions: [], events: [] }),
    ).toMatchObject({ monday: "2027-01-04", week: 1 });
    // Monday 29 December 2025 is already week 1 of 2026.
    expect(
      nextWeekSummary({ monday: nextMonday("2025-12-24"), riders, sessions: [], events: [] }),
    ).toMatchObject({ monday: "2025-12-29", week: 1 });
  });

  it("count a week that runs over New Year's as one week", () => {
    const summary = nextWeekSummary({
      monday: "2025-12-29",
      riders: [{ id: "emma" }],
      sessions: [session("emma", "2025-12-30"), session("emma", "2026-01-03")],
      events: [event("holiday", null, "2025-12-24", "2026-01-01")],
    });
    expect(summary).toMatchObject({ state: "all", sessions: 2, week: 1 });
    expect(nextWeekLine(summary.kinds, wordsFor("da"))).toBe(
      "Holdet har ferie mandag til torsdag.",
    );
  });
});
