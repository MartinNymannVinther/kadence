import { clockText } from "./time-place";

/**
 * The events in "Del ugen" (docs/backlog.md P2-03): a race, a camp or the
 * team's own day, with when and where it starts and who drives, so a
 * parent can plan the weekend from the club's chat.
 *
 * What goes in is the plan and nothing about a person (ADR 0058): the
 * team's own events in the team's week, and in one rider's week also
 * that rider's races and camps — never an exam, school, a holiday or a
 * week ill, which are the rider's own business.
 *
 * Pure: imports nothing from the database.
 */

export type ShareEvent = {
  riderId: string | null;
  kind: string;
  title: string;
  startsOn: string;
  endsOn: string;
  startTime: string | null;
  meetingPlace: string;
  transportNote: string;
};

export type ShareEventWords = {
  /** "løb"; "" for a kind not worth naming. */
  kind: (kind: string) => string;
  /** "til og med søndag 12. oktober" */
  until: (day: string) => string;
  /** "Kørsel: Annes bil fra klubhuset" */
  transport: (note: string) => string;
};

/** A rider's own events that belong in a shared week: the riding ones. */
const RIDING_KINDS = new Set(["race", "camp"]);

export function sharedEvents(events: readonly ShareEvent[], riderWeek: boolean): ShareEvent[] {
  return events.filter((e) => e.riderId === null || (riderWeek && RIDING_KINDS.has(e.kind)));
}

/** "søndag 12. oktober" / "Sunday 12 October", as Intl writes it inside a sentence. */
export function dayInText(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

/**
 * "– 09.30, Odense Havn: Fyn Rundt (løb)" and, below it, who drives. An
 * event that started before `day` (the week's Monday) says no time: its
 * time belongs to its first day.
 */
export function eventLines(
  event: ShareEvent,
  day: string,
  words: ShareEventWords,
  locale: string,
): string[] {
  const first = event.startsOn === day;
  const when = [
    first && event.startTime ? clockText(event.startTime, locale) : "",
    first ? event.meetingPlace.trim() : "",
  ].filter(Boolean);
  const about = [
    words.kind(event.kind),
    event.endsOn > day ? words.until(dayInText(event.endsOn, locale)) : "",
  ].filter(Boolean);
  const transport = first ? event.transportNote.trim() : "";
  return [
    `– ${when.length > 0 ? `${when.join(", ")}: ` : ""}${event.title.trim()}${about.length > 0 ? ` (${about.join(", ")})` : ""}`,
    ...(transport ? [`  ${words.transport(transport)}`] : []),
  ];
}
