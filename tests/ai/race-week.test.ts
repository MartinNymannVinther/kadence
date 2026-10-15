import { describe, expect, it } from "vitest";
import {
  dropRaceDaySessions,
  groupWeekEvents,
  raceDays,
  raceWeekRules,
  type EventRow,
} from "@/modules/assist/race-week";
import type { DraftSession } from "@/modules/assist/week-draft";

/**
 * A week around a race (docs/adr/0101). Martin's own week, on the
 * Motionist profile in his personal workspace: a race on Saturday 24
 * October in his calendar, and a draft that put a recovery ride on the
 * race day, no opener on Friday, and never saw the race. Now the race
 * reaches the model as kind, dates and priority, the prompts plan around
 * it as a coach would, and no session lands on the race day whatever the
 * model answers. A club's rider events still stay out of the group's week.
 */

const RACE: EventRow = {
  kind: "race",
  title: "Løb i Hillerød",
  riderId: "r_martin",
  startsOn: "2026-10-24",
  endsOn: "2026-10-24",
  priority: null,
};
const TEAM_CAMP: EventRow = {
  kind: "camp",
  title: "Klubbens lejr",
  riderId: null,
  startsOn: "2026-10-25",
  endsOn: "2026-10-25",
  priority: null,
};
const SICK: EventRow = {
  ...RACE,
  kind: "ill",
  title: "Forkølet",
  startsOn: "2026-10-19",
  endsOn: "2026-10-20",
};

const session = (date: string, title: string): DraftSession => ({
  date,
  sport: "bike",
  title,
  minutes: 45,
  templateId: null,
  structure: { kind: "bike", steps: [] },
  why: "",
});

describe("the race-week rules", () => {
  it("plan around the race as a coach would", () => {
    const rules = raceWeekRules("youth");
    expect(rules).toContain("The calendar's events are fixed");
    expect(rules).toContain("A race day is the race itself: plan no training session on that day.");
    expect(rules).toContain("The day before a race: a short opener");
    expect(rules).toContain("3–4 × 1 min in zone 5");
    expect(rules).toContain(
      "In the two days before an A or B race: nothing hard and nothing long.",
    );
    expect(rules).toContain("The day after a race: rest or a short, easy ride.");
    expect(rules).toContain("counts as the week's hard session or sessions");
    expect(rules).toContain("A race without a priority counts as B.");
    expect(rules).toContain(
      "A race named in the wishes for the week counts as one in the calendar",
    );
    expect(rules).toContain("say in the note");
    expect(raceWeekRules("adult")).toContain("A race or event day is the race or event itself");
  });
});

describe("the calendar a group's week reads", () => {
  it("in a personal workspace: the person's own race, as kind, dates and priority", () => {
    const { prompt, shown } = groupWeekEvents([RACE, TEAM_CAMP], true);
    expect(prompt).toEqual([
      { kind: "race", from: "2026-10-24", to: "2026-10-24", priority: null },
      { kind: "camp", from: "2026-10-25", to: "2026-10-25", priority: null },
    ]);
    // Shown back to the person, with their own words.
    expect(shown.map((e) => e.title)).toEqual(["Løb i Hillerød", "Klubbens lejr"]);
  });

  it("in a personal workspace: no sick days, which are health data", () => {
    const { prompt, shown } = groupWeekEvents([SICK, RACE], true);
    expect(prompt.map((e) => e.kind)).toEqual(["race"]);
    expect(shown.map((e) => e.kind)).toEqual(["race"]);
  });

  it("in a club: the team's own events with their titles, and no rider's", () => {
    const { prompt, shown } = groupWeekEvents([RACE, TEAM_CAMP], false);
    expect(prompt).toEqual([
      {
        kind: "camp",
        title: "Klubbens lejr",
        from: "2026-10-25",
        to: "2026-10-25",
        priority: null,
      },
    ]);
    expect(shown.map((e) => e.title)).toEqual(["Klubbens lejr"]);
  });
});

describe("the guard", () => {
  const draft = {
    sessions: [
      session("2026-10-19", "Let grundtur"),
      session("2026-10-23", "Åbner"),
      session("2026-10-24", "Kort restitutionstur"),
      session("2026-10-25", "Rolig tur"),
    ],
    note: "Lørdagens løb er prioriteret.",
  };

  it("drops a session the model put on the race day", () => {
    const kept = dropRaceDaySessions(draft, [
      { kind: "race", from: "2026-10-24", to: "2026-10-24" },
    ]);
    expect(kept.sessions.map((s) => s.title)).toEqual(["Let grundtur", "Åbner", "Rolig tur"]);
    expect(kept.note).toBe(draft.note);
  });

  it("covers every day of a stage race, and only races", () => {
    expect([...raceDays([{ kind: "race", from: "2026-10-23", to: "2026-10-25" }])]).toEqual([
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    const kept = dropRaceDaySessions(draft, [
      { kind: "camp", from: "2026-10-19", to: "2026-10-25" },
      { kind: "exam", from: "2026-10-24", to: "2026-10-24" },
    ]);
    expect(kept.sessions).toHaveLength(4);
  });

  it("keeps what the proposal carries beside its sessions", () => {
    const kept = dropRaceDaySessions({ ...draft, events: [{ kind: "race" }] }, [
      { kind: "race", from: "2026-10-24", to: "2026-10-24" },
    ]);
    expect(kept.events).toEqual([{ kind: "race" }]);
  });
});
