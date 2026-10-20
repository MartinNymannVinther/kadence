import { addDaysIso, maxIso, minIso, mondayOf, weekNumber } from "@/core/dates";

/**
 * The first card on a coach's Overblik: whether next week is planned —
 * for none of the riders yet, for some, or for all of them — and what is
 * in it that a plan has to go around: the riders' own holidays, exams,
 * school and illness (the family's days among them, ADR 0069), and the
 * team's camps and races. A coach's unit is the week, so the next one is
 * the first thing Overblik asks about.
 *
 * Pure: the page reads the sessions and the events under RLS and hands
 * them in, and the words come from the reader's language, so the counting
 * and the sentence are tested on their own.
 */

/** The kinds a week's plan goes around, in the order the sentence names them. */
export const PLANNING_KINDS = ["holiday", "exam", "school", "ill", "camp", "race"] as const;
export type PlanningKind = (typeof PLANNING_KINDS)[number];

export type NextWeekState = "none" | "some" | "all";

/** A span of days inside the week, both ends included. */
export type DaySpan = { from: string; to: string };

export type KindInWeek = {
  kind: PlanningKind;
  /** Riders on the team with an event of their own of this kind in the week. */
  riders: number;
  /** The team's own events of this kind, as the days each covers inside the week. */
  team: DaySpan[];
};

export type NextWeekSummary = {
  monday: string;
  /** The ISO week number Danish calendars use. */
  week: number;
  state: NextWeekState;
  /** Planned sessions in the week for the team's riders. */
  sessions: number;
  /** Riders with at least one of them. */
  planned: number;
  riders: number;
  /** What is in the week, by kind, only the kinds that are there. */
  kinds: KindInWeek[];
};

type SessionIn = { riderId: string; onDate: string };
type EventIn = { kind: string; riderId: string | null; startsOn: string; endsOn: string };

/** The Monday after the week `today` falls in. */
export const nextMonday = (today: string): string => addDaysIso(mondayOf(today), 7);

export function nextWeekSummary(input: {
  monday: string;
  riders: readonly { id: string }[];
  sessions: readonly SessionIn[];
  events: readonly EventIn[];
}): NextWeekSummary {
  const { monday } = input;
  const sunday = addDaysIso(monday, 6);
  const team = new Set(input.riders.map((r) => r.id));
  const inWeek = input.sessions.filter(
    (s) => team.has(s.riderId) && s.onDate >= monday && s.onDate <= sunday,
  );
  const planned = new Set(inWeek.map((s) => s.riderId)).size;
  const state: NextWeekState = inWeek.length === 0 ? "none" : planned >= team.size ? "all" : "some";

  const touching = input.events.filter((e) => e.startsOn <= sunday && e.endsOn >= monday);
  const kinds: KindInWeek[] = [];
  for (const kind of PLANNING_KINDS) {
    const of = touching.filter((e) => e.kind === kind);
    // A rider who is no longer on the team (archived) is not part of the plan.
    const riders = new Set(
      of.flatMap((e) => (e.riderId !== null && team.has(e.riderId) ? [e.riderId] : [])),
    ).size;
    const spans = new Map<string, DaySpan>();
    for (const e of of) {
      if (e.riderId !== null) continue;
      const span = { from: maxIso([e.startsOn, monday]), to: minIso([e.endsOn, sunday]) };
      spans.set(`${span.from}/${span.to}`, span);
    }
    const teamSpans = [...spans.values()].sort((a, b) => a.from.localeCompare(b.from));
    if (riders > 0 || teamSpans.length > 0) kinds.push({ kind, riders, team: teamSpans });
  }

  return {
    monday,
    week: weekNumber(monday),
    state,
    sessions: inWeek.length,
    planned,
    riders: team.size,
    kinds,
  };
}

export type NextWeekWords = {
  /** "2 ryttere har ferie" */
  riders: (kind: PlanningKind, count: number) => string;
  /** "der er løb lørdag": `days` as `day`, `span` and `list` say them */
  team: (kind: PlanningKind, days: string) => string;
  /** "lørdag" / "on Saturday" */
  day: (iso: string) => string;
  /** "fredag til søndag" / "from Friday to Sunday" */
  span: (from: string, to: string) => string;
  /** "lørdag og søndag": a list in the reader's language */
  list: (items: string[]) => string;
  /** "og" / "and", before the last of several clauses */
  and: string;
  locale: string;
};

/**
 * What is in the week as one sentence: the riders' own days first, then
 * the team's — "2 ryttere har ferie, og der er løb lørdag." Clauses are
 * joined with a comma, and the last with a comma and "og", as Danish
 * joins main clauses (and English, with its serial comma). Null when the
 * week holds nothing a plan has to go around.
 */
export function nextWeekLine(kinds: readonly KindInWeek[], words: NextWeekWords): string | null {
  const days = (spans: DaySpan[]) =>
    words.list(spans.map((s) => (s.from === s.to ? words.day(s.from) : words.span(s.from, s.to))));
  const clauses = [
    ...kinds.filter((k) => k.riders > 0).map((k) => words.riders(k.kind, k.riders)),
    ...kinds.filter((k) => k.team.length > 0).map((k) => words.team(k.kind, days(k.team))),
  ];
  if (clauses.length === 0) return null;
  const last = clauses.at(-1)!;
  const joined =
    clauses.length === 1 ? last : `${clauses.slice(0, -1).join(", ")}, ${words.and} ${last}`;
  return `${joined.charAt(0).toLocaleUpperCase(words.locale)}${joined.slice(1)}.`;
}
