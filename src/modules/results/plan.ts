import type { DcuResult } from "./dcu-profile";

/**
 * Where each result Cykling Danmark published goes in the rider's
 * calendar (ADR 0039). A result hangs on a race:
 *
 * - the race it hung on before, when it was read once already;
 * - otherwise a race already in the calendar on that day — the rider's
 *   own before the team's — so a race the coach planned gets its result
 *   and is not doubled;
 * - otherwise a race Kadence makes for the day, one per day however many
 *   results the day had (a stage and the overall, two stages).
 *
 * Only results from `since` on are placed: the season before and this
 * one, not a rider's whole history.
 *
 * Pure: imports nothing from the database, tested on its own.
 */

export type PlanEvent = {
  id: string;
  riderId: string | null;
  kind: string;
  startsOn: string;
  endsOn: string;
};

export type PlannedResult = DcuResult & { event: { id: string } | { newOn: string } };
export type NewRace = { on: string; title: string };
export type ImportPlan = { newRaces: NewRace[]; results: PlannedResult[] };

/** The longest a title in the calendar may be (EventInput in src/modules/training/events.ts). */
const TITLE_MAX = 120;

/** The day's title: what the day's races share when that says something, else the first. */
export function titleFor(races: string[]): string {
  const first = races[0] ?? "";
  let prefix = first;
  for (const race of races.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < race.length && prefix[i] === race[i]) i++;
    prefix = prefix.slice(0, i);
  }
  // A prefix that ends inside a word ("Etape" of "Etapeløb") goes back to the word before.
  const letter = /[\p{L}\p{N}]/u;
  if (letter.test(prefix.slice(-1)) && races.some((r) => letter.test(r.charAt(prefix.length)))) {
    prefix = prefix.replace(/\S+$/, "");
  }
  prefix = prefix.replace(/[\s\-–,:]+$/, "");
  return (prefix.length >= 6 ? prefix : first).slice(0, TITLE_MAX);
}

export function planImport(input: {
  riderId: string;
  results: DcuResult[];
  /** The races in the calendar that are the rider's or the team's. */
  events: PlanEvent[];
  /** The event each result read before hangs on, by its source ref. */
  known: Map<string, string>;
  since: string;
}): ImportPlan {
  const races = input.events
    .filter((e) => e.kind === "race" && (e.riderId === null || e.riderId === input.riderId))
    .sort(
      (a, b) =>
        Number(a.riderId === null) - Number(b.riderId === null) ||
        a.startsOn.localeCompare(b.startsOn) ||
        a.id.localeCompare(b.id),
    );
  const results: PlannedResult[] = [];
  const newDays = new Map<string, string[]>();
  for (const result of input.results) {
    if (result.racedOn < input.since) continue;
    const before = input.known.get(result.sourceRef);
    const there = races.find((e) => e.startsOn <= result.racedOn && e.endsOn >= result.racedOn);
    const eventId = before ?? there?.id;
    if (eventId) {
      results.push({ ...result, event: { id: eventId } });
      continue;
    }
    results.push({ ...result, event: { newOn: result.racedOn } });
    newDays.set(result.racedOn, [...(newDays.get(result.racedOn) ?? []), result.race]);
  }
  const newRaces = [...newDays.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([on, names]) => ({ on, title: titleFor(names) }));
  return { newRaces, results };
}
