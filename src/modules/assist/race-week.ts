import { addDaysIso } from "@/core/dates";
import { targetIntensity } from "@/modules/load/planned-load";
import { racePrepSession } from "@/modules/workouts/race-prep";
import { flattenSteps, structureMinutes, ZONE_FTP_PCT } from "@/modules/workouts/structure";
import type { DraftSession, WeekDraft } from "./week-draft";

/**
 * A week around a race (docs/adr/0101, 0102, 0103): what the week drafts
 * tell the model about races, which calendar days a group's week reads,
 * and the guard that leaves the race itself as the race day's one
 * session. Pure.
 */

/** A calendar day as the model reads it. A person's own carries a title only when it is a race. */
export type PromptEvent = {
  kind: string;
  title?: string;
  from: string;
  to: string;
  priority: string | null;
};

/** A calendar day as the proposal shows it back, so the reader sees what the AI saw. */
export type ShownEvent = { kind: string; title: string; from: string; to: string };

export type EventRow = {
  kind: string;
  title: string;
  riderId: string | null;
  startsOn: string;
  endsOn: string;
  priority: string | null;
};

/**
 * Race-week rules, as a coach plans a week around a race. `adult` speaks
 * of a race or event (a sportive); a youth week speaks of races, inside
 * the federation's frame the prompt already holds. The race day holds the
 * race as a session (docs/adr/0103), the day before holds the race prep,
 * which Kadence lays in itself (docs/adr/0106), and the warm-up's word is
 * given in the reader's language, so the model does not make a session of
 * "opvarmning".
 */
export function raceWeekRules(audience: "youth" | "adult", locale: string): string {
  const race = audience === "adult" ? "race or event" : "race";
  return [
    "The calendar's events are fixed: plan the week around them.",
    `A ${race} day holds one session, the ${race} itself: sport "bike", the ${race}'s name from the calendar as its title, and a workout of warm-up, the ${race} by feel and a cool-down, e.g. '15 min opvarmning, 45 min RPE 9, 10 min nedkørsel' for a cyclocross race of about 45 minutes. Its minutes are the whole session. Plan nothing else on that day.`,
    `The day before a ${race} holds the race prep, which Kadence lays in itself: an hour easy with 5 minutes at threshold (zone 4). Plan no session on that day, and count its hour in the week's bike hours.`,
    locale === "en"
      ? `A warm-up is ridden before the start on the ${race} day, inside the ${race}'s session, never as a session of its own.`
      : `"Opvarmning" is ridden before the start on the ${race} day, inside the ${race}'s session, never as a session of its own.`,
    `In the two days before an A or B ${race}: nothing hard and nothing long.`,
    `The day after a ${race}: rest or a short, easy ride.`,
    `The ${race} counts as the week's hard session or sessions, not as extra on top of them.`,
    `A ${race} is ridden hard whatever the season, phase or month says: in an easy or free month the training around it stays easy, and the ${race} is still the week's hard effort, never an easy ride.`,
    `Read the ${race}'s kind and length from its title: a cyclocross race, for one, is short and ridden flat out. Its session counts in the week's bike hours.`,
    `A ${race} without a priority counts as B.`,
    `A ${race} named in the wishes for the week counts as one in the calendar, on the day named, with a session of its own.`,
    `When the week holds a ${race}, say in the note, by its name, that it is the week's hard effort and how the days around it are laid.`,
  ].join(" ");
}

/**
 * The calendar days a group's week reads, for the model and for the
 * proposal. A club reads its team's own events with their titles; a
 * rider's event there is that rider's data and stays out. A personal
 * workspace (docs/adr/0080) is one person's training, so its rider's
 * events count too, as kind, dates and priority. A race also goes with
 * its title, the name of a public event that says what kind of race it
 * is (docs/adr/0102); the person's other days go without theirs, and sick
 * days, which are health data, not at all.
 */
export function groupWeekEvents(
  rows: EventRow[],
  personal: boolean,
): { prompt: PromptEvent[]; shown: ShownEvent[] } {
  const read = personal
    ? rows.filter((e) => e.kind !== "ill")
    : rows.filter((e) => e.riderId === null);
  const sorted = [...read].sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  return {
    prompt: sorted.map((e) => ({
      kind: e.kind,
      ...(!personal || e.kind === "race" ? { title: e.title } : {}),
      from: e.startsOn,
      to: e.endsOn,
      priority: e.priority,
    })),
    shown: sorted.map((e) => ({ kind: e.kind, title: e.title, from: e.startsOn, to: e.endsOn })),
  };
}

type CalendarRace = { kind: string; title?: string; from: string; to: string };

/** Every day a race in the calendar covers, with the race's name where the calendar gives it. */
function raceDayTitles(events: CalendarRace[]): Map<string, string | null> {
  const days = new Map<string, string | null>();
  for (const e of events) {
    if (e.kind !== "race" || e.to < e.from) continue;
    // A stage race is days, not months: a month bounds a mistyped end.
    for (let d = e.from, n = 0; d <= e.to && n < 31; d = addDaysIso(d, 1), n++)
      if (!days.has(d)) days.set(d, e.title?.trim() || null);
  }
  return days;
}

/** Every day a race in the calendar covers, from its first day to its last. */
export function raceDays(events: CalendarRace[]): Set<string> {
  return new Set(raceDayTitles(events).keys());
}

/** Threshold and up (zone 4's low end), where a race is ridden. */
const HARD = ZONE_FTP_PCT[4].low / 100;

/** A bike session with at least one step at threshold or harder: a race, not a spin. */
function ridesHard(s: DraftSession): boolean {
  return (
    s.structure.kind === "bike" &&
    flattenSteps(s.structure).some((step) => targetIntensity(step.target, step.intent) >= HARD)
  );
}

/**
 * The race days of a draft, settled whatever the model said (docs/adr/0103):
 * on a day a race in the calendar covers, the longest bike session ridden
 * hard is the race, named as the calendar names it, and every other
 * session that day goes. A race day without one stays empty: an easy spin
 * is not the race, and how long a race is, Kadence does not guess.
 */
export function settleRaceDays<T extends WeekDraft>(draft: T, events: CalendarRace[]): T {
  const races = raceDayTitles(events);
  if (races.size === 0) return draft;
  const race = new Map<string, DraftSession>();
  for (const s of draft.sessions) {
    if (!races.has(s.date) || !ridesHard(s)) continue;
    const longest = race.get(s.date);
    if (!longest || s.minutes > longest.minutes) race.set(s.date, s);
  }
  const sessions = draft.sessions.flatMap((s) => {
    if (!races.has(s.date)) return [s];
    if (race.get(s.date) !== s) return [];
    return [{ ...s, title: races.get(s.date) ?? s.title }];
  });
  return { ...draft, sessions };
}

/**
 * The race prep the day before every race, whatever the model said
 * (docs/adr/0106): on the day before a race's first day, inside the week
 * and no race day itself, the model's sessions go and DCU's opladning
 * comes in their place (workouts/race-prep.ts). A race on the Monday has
 * its eve in the week before, which this draft does not plan.
 */
export function layRacePrep<T extends WeekDraft>(
  draft: T,
  events: CalendarRace[],
  monday: string,
  locale: string,
): T {
  const races = raceDayTitles(events);
  const sunday = addDaysIso(monday, 6);
  const eves = new Set<string>();
  for (const day of races.keys()) {
    const eve = addDaysIso(day, -1);
    if (eve >= monday && eve <= sunday && !races.has(eve)) eves.add(eve);
  }
  if (eves.size === 0) return draft;
  const prep = racePrepSession(locale);
  const laid = [...eves].map((date): DraftSession => ({
    date,
    sport: prep.sport,
    title: prep.title,
    minutes: structureMinutes(prep.structure),
    templateId: null,
    structure: prep.structure,
    why: prep.description,
  }));
  const sessions = [...draft.sessions.filter((s) => !eves.has(s.date)), ...laid].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return { ...draft, sessions };
}
