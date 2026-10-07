import { z } from "zod";

/**
 * When and where a session starts (docs/adr/0058-time-and-place-on-a-session.md):
 * "17.30 fra klubhuset". Both optional, on every form that writes a
 * session. The time is a wall-clock time in Copenhagen with no date and no
 * zone — the session's day already says which day — kept as Postgres
 * `time` and handled here as "HH:MM".
 *
 * Pure: imports nothing from the database.
 */

export const MAX_PLACE = 120;
/** A race's or a camp's note on who drives: "Annes bil fra klubhuset kl. 7.30". */
export const MAX_TRANSPORT = 200;

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const StartTime = z.string().regex(HH_MM);
export const MeetingPlace = z.string().trim().max(MAX_PLACE);
export const TransportNote = z.string().trim().max(MAX_TRANSPORT);

/**
 * The two fields as an input carries them: left out, they leave a session
 * as it is; `null` and "" clear them.
 */
export const TimePlaceFields = {
  startTime: StartTime.nullable().optional(),
  meetingPlace: MeetingPlace.optional(),
};

export type TimePlace = { startTime: string | null; meetingPlace: string };

/** The database's "17:30:00" (or the form's "17:30") as "17:30"; anything else as none. */
export function clockOf(value: string | null | undefined): string | null {
  const match = value ? /^([01]\d|2[0-3]):([0-5]\d)/.exec(value) : null;
  return match ? `${match[1]}:${match[2]}` : null;
}

/** A start time as a reader writes it: "17.30" in Danish, "17:30" in English. */
export function clockText(time: string, locale: string): string {
  const clock = clockOf(time);
  if (!clock) return "";
  return locale === "en" ? clock : clock.replace(":", ".");
}

/** "17.30 · Klubhuset", "17.30", "Klubhuset" or "": the compact line on a card. */
export function timePlaceText(
  session: { startTime: string | null; meetingPlace: string },
  locale: string,
): string {
  const time = session.startTime ? clockText(session.startTime, locale) : "";
  return [time, session.meetingPlace.trim()].filter(Boolean).join(" · ");
}

/**
 * A day's sessions in the order they start: those with a time by the
 * time, those without after them, each group in the order it had.
 */
export function byStartTime<T extends { startTime: string | null }>(sessions: readonly T[]): T[] {
  return sessions
    .map((session, index) => ({ session, index, clock: clockOf(session.startTime) }))
    .sort((a, b) => {
      if (a.clock && b.clock && a.clock !== b.clock) return a.clock < b.clock ? -1 : 1;
      if (a.clock && !b.clock) return -1;
      if (!a.clock && b.clock) return 1;
      return a.index - b.index;
    })
    .map((entry) => entry.session);
}
