import { describe, expect, it } from "vitest";
import {
  groupWeekEvents,
  raceDays,
  raceWeekRules,
  settleRaceDays,
  type EventRow,
} from "@/modules/assist/race-week";
import type { DraftSession } from "@/modules/assist/week-draft";
import { parseWorkoutText } from "@/modules/workouts/parse-text";
import { flattenSteps, readStructure, type Structure } from "@/modules/workouts/structure";

/**
 * A week around a race (docs/adr/0101, 0102, 0103). Martin's own week,
 * on the Motionist profile in his personal workspace: a race on Saturday
 * 24 October in his calendar. The race reaches the model as kind, dates,
 * priority and its title; the prompts plan around it as a coach would —
 * as the week's hard effort, even in a free month, with an opener in
 * plain Danish the day before — and the race day holds the race itself
 * as its one session, named as the calendar names it, whatever the model
 * answers. A club's rider events still stay out of the group's week.
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

const easy: Structure = parseWorkoutText("45 min Z1")!;
const race: Structure = parseWorkoutText("15 min opvarmning, 45 min RPE 9, 10 min nedkørsel")!;

const session = (
  date: string,
  title: string,
  structure: Structure = easy,
  minutes = 45,
  sport: DraftSession["sport"] = "bike",
): DraftSession => ({ date, sport, title, minutes, templateId: null, structure, why: "" });

describe("the race-week rules", () => {
  it("plan around the race as a coach would", () => {
    const rules = raceWeekRules("youth", "da");
    expect(rules).toContain("The calendar's events are fixed");
    expect(rules).toContain(
      'A race day holds one session, the race itself: sport "bike", the race\'s name from the calendar as its title',
    );
    expect(rules).toContain("Plan nothing else on that day.");
    expect(rules).toContain("The day before a race: rest, or a short opener");
    expect(rules).toContain(
      "In the two days before an A or B race: nothing hard and nothing long.",
    );
    expect(rules).toContain("The day after a race: rest or a short, easy ride.");
    expect(rules).toContain("counts as the week's hard session or sessions");
    // A cross race in October, the Motionist's free month, came back as "a light activity".
    expect(rules).toContain(
      "A race is ridden hard whatever the season, phase or month says: in an easy or free month the training around it stays easy, and the race is still the week's hard effort, never an easy ride.",
    );
    expect(rules).toContain("Read the race's kind and length from its title");
    expect(rules).toContain("Its session counts in the week's bike hours.");
    expect(rules).toContain("A race without a priority counts as B.");
    expect(rules).toContain(
      "A race named in the wishes for the week counts as one in the calendar, on the day named, with a session of its own.",
    );
    expect(rules).toContain("say in the note, by its name, that it is the week's hard effort");
    expect(raceWeekRules("adult", "da")).toContain(
      "A race or event day holds one session, the race or event itself",
    );
  });

  it("give the day before its Danish words, so an opener is not called a warm-up", () => {
    // The model called Friday's opener "Opvarmning til cross … med lidt spidse".
    const da = raceWeekRules("adult", "da");
    expect(da).toContain('Title the opener "Kort tur med ryk".');
    expect(da).toContain('"Opvarmning" is ridden before the start on the race or event day');
    expect(da).toContain('Short, hard efforts are "ryk" or "spurter" in Danish.');
    const en = raceWeekRules("adult", "en");
    expect(en).toContain('Title the opener "Opener".');
    expect(en).not.toContain("Kort tur med ryk");
  });

  it("give examples the shorthand reader understands", () => {
    const rules = raceWeekRules("youth", "da");
    const examples = [...rules.matchAll(/e\.g\. '([^']+)'/g)].map((m) => m[1]!);
    expect(examples).toEqual([
      "15 min opvarmning, 45 min RPE 9, 10 min nedkørsel",
      "40 min Z2, 3x1 min Z5 / 2 min pause, 5 min Z1",
    ]);
    for (const text of examples) expect(parseWorkoutText(text)).not.toBeNull();
    const steps = flattenSteps(parseWorkoutText(examples[0]!)!);
    expect(steps.map((st) => st.target)).toContainEqual({ kind: "rpe", value: 9 });
  });
});

describe("the calendar a group's week reads", () => {
  it("in a personal workspace: the person's own race with its title, the other days as dates", () => {
    const { prompt, shown } = groupWeekEvents([RACE, TEAM_CAMP], true);
    expect(prompt).toEqual([
      {
        kind: "race",
        title: "Løb i Hillerød",
        from: "2026-10-24",
        to: "2026-10-24",
        priority: null,
      },
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

describe("the race day", () => {
  const draft = {
    sessions: [
      session("2026-10-19", "Let grundtur"),
      session("2026-10-23", "Kort tur med ryk"),
      session("2026-10-24", "Opvarmning", parseWorkoutText("15 min Z2")!, 15),
      session("2026-10-24", "Cross", race, 70),
      session("2026-10-24", "Styrke", readStructure({}, "strength"), 30, "strength"),
      session("2026-10-25", "Rolig tur"),
    ],
    note: "Lørdagens cross er ugens hårde indsats.",
  };
  const RACE_DAY = [
    { kind: "race", title: "Cross i Hillerød", from: "2026-10-24", to: "2026-10-24" },
  ];

  it("holds the race itself as its one session, named as the calendar names it", () => {
    const settled = settleRaceDays(draft, RACE_DAY);
    expect(settled.sessions.map((s) => [s.date, s.title, s.minutes])).toEqual([
      ["2026-10-19", "Let grundtur", 45],
      ["2026-10-23", "Kort tur med ryk", 45],
      ["2026-10-24", "Cross i Hillerød", 70],
      ["2026-10-25", "Rolig tur", 45],
    ]);
    expect(settled.sessions[2]!.structure).toEqual(race);
    expect(settled.note).toBe(draft.note);
  });

  it("is left empty when the model put only an easy ride on it", () => {
    // What the model once answered: a recovery ride on the race day itself.
    const settled = settleRaceDays(
      { sessions: [session("2026-10-24", "Kort restitutionstur")], note: "" },
      RACE_DAY,
    );
    expect(settled.sessions).toEqual([]);
  });

  it("keeps the model's title when the calendar gives the race none", () => {
    const settled = settleRaceDays(draft, [{ kind: "race", from: "2026-10-24", to: "2026-10-24" }]);
    expect(settled.sessions.find((s) => s.date === "2026-10-24")?.title).toBe("Cross");
  });

  it("covers every day of a stage race, and only races", () => {
    expect([...raceDays([{ kind: "race", from: "2026-10-23", to: "2026-10-25" }])]).toEqual([
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    const settled = settleRaceDays(draft, [
      { kind: "camp", title: "Lejr", from: "2026-10-19", to: "2026-10-25" },
      { kind: "exam", title: "Eksamen", from: "2026-10-24", to: "2026-10-24" },
    ]);
    expect(settled.sessions).toHaveLength(6);
  });

  it("keeps what the proposal carries beside its sessions", () => {
    const settled = settleRaceDays({ ...draft, events: [{ kind: "race" }] }, RACE_DAY);
    expect(settled.events).toEqual([{ kind: "race" }]);
  });
});
