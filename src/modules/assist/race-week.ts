import { addDaysIso } from "@/core/dates";
import type { WeekDraft } from "./week-draft";

/**
 * A week around a race (docs/adr/0101, 0102): what the week drafts tell
 * the model about races, which calendar days a group's week reads, and
 * the guard that keeps a proposed session off a race day. Pure.
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
 * the federation's frame the prompt already holds.
 */
export function raceWeekRules(audience: "youth" | "adult"): string {
  const race = audience === "adult" ? "race or event" : "race";
  return [
    "The calendar's events are fixed: plan the week around them.",
    `A ${race} day is the ${race} itself: plan no training session on that day.`,
    `The day before a ${race}: a short opener — about 45–60 min easy with a few short efforts, e.g. 3–4 × 1 min in zone 5 or a few sprints — or rest.`,
    `In the two days before an A or B ${race}: nothing hard and nothing long.`,
    `The day after a ${race}: rest or a short, easy ride.`,
    `The ${race} counts as the week's hard session or sessions, not as extra on top of them.`,
    `A ${race} is ridden hard whatever the season, phase or month says: in an easy or free month the training around it stays easy, and the ${race} is still the week's hard effort, never an easy ride.`,
    `Count the ${race}'s riding time in the week's bike hours, and read its kind and length from its title when the calendar gives one: a cyclocross race, for one, is short and ridden flat out.`,
    `A ${race} without a priority counts as B.`,
    `A ${race} named in the wishes for the week counts as one in the calendar, on the day named.`,
    `When the week holds a ${race}, say in the note that it is the week's hard effort and how the week is laid around it.`,
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

/** Every day a race in the calendar covers, from its first day to its last. */
export function raceDays(events: Array<{ kind: string; from: string; to: string }>): Set<string> {
  const days = new Set<string>();
  for (const e of events) {
    if (e.kind !== "race" || e.to < e.from) continue;
    // A stage race is days, not months: a month bounds a mistyped end.
    for (let d = e.from, n = 0; d <= e.to && n < 31; d = addDaysIso(d, 1), n++) days.add(d);
  }
  return days;
}

/** The draft without a session on a race day: the race is the day's training, whatever the model said. */
export function dropRaceDaySessions<T extends WeekDraft>(
  draft: T,
  events: Array<{ kind: string; from: string; to: string }>,
): T {
  const days = raceDays(events);
  if (days.size === 0) return draft;
  return { ...draft, sessions: draft.sessions.filter((s) => !days.has(s.date)) };
}
