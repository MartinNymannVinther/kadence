import { mondayOf } from "@/core/dates";
import type { GridWeek } from "@/modules/calendar/grid";
import type { ComplianceColour } from "@/modules/load";
import { calendarHref, type CalendarQuery } from "./href";
import { colourOf, dayColour } from "./team-days";
import type { CalendarActivityCard, CalendarCard, CalendarEventCard } from "./types";

/**
 * A month as the month views draw it (docs/adr/0093): for one rider each
 * day of the grid with its sessions in the load model's colours, the
 * rides nobody planned, the events on it and where a press leads; for the
 * team each rider's days as dots. Pure, so the shaping is tested without
 * React; the components only draw what this returns.
 */

export type MonthSession = {
  id: string;
  sport: string;
  title: string;
  minutes: number;
  colour: ComplianceColour;
  done: boolean;
};
export type MonthRide = { id: string; sport: string; minutes: number };
export type MonthEvent = { id: string; kind: string; title: string; first: boolean };

export type MonthCell = {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  sessions: MonthSession[];
  rides: MonthRide[];
  events: MonthEvent[];
  /** One session opens its panel here; any other day its week, scrolled to the day. */
  href: string;
};

const on = (date: string, e: CalendarEventCard) => e.startsOn <= date && e.endsOn >= date;

/** The week view's address for a day, with the day in view. */
export function dayHref(date: string, query: CalendarQuery): string {
  const week = calendarHref({ rider: query.rider, week: mondayOf(date) });
  return `${week}#day-${date}`;
}

function sessionsOn(date: string, sessions: readonly CalendarCard[], today: string) {
  return sessions
    .filter((s) => s.onDate === date)
    .map((s) => ({
      id: s.id,
      sport: s.sport,
      title: s.title,
      minutes: s.plannedMinutes,
      colour: colourOf(s, today),
      done: s.activity !== null,
    }));
}

export function monthCells(
  riderId: string,
  weeks: readonly GridWeek[],
  input: {
    sessions: readonly CalendarCard[];
    activities: readonly CalendarActivityCard[];
    events: readonly CalendarEventCard[];
  },
  today: string,
  query: CalendarQuery,
): Array<{ monday: string; cells: MonthCell[] }> {
  const sessions = input.sessions.filter((s) => s.riderId === riderId);
  const activities = input.activities.filter((a) => a.riderId === riderId);
  const events = input.events.filter((e) => e.riderId === null || e.riderId === riderId);
  return weeks.map((week) => ({
    monday: week.monday,
    cells: week.days.map(({ date, inMonth }) => {
      const mine = sessionsOn(date, sessions, today);
      return {
        date,
        inMonth,
        isToday: date === today,
        sessions: mine,
        rides: activities
          .filter((a) => a.onDate === date)
          .map((a) => ({ id: a.id, sport: a.sport, minutes: a.movingSeconds / 60 })),
        events: events
          .filter((e) => on(date, e))
          .map((e) => ({ id: e.id, kind: e.kind, title: e.title, first: e.startsOn === date })),
        href:
          mine.length === 1
            ? calendarHref({ ...query, session: mine[0]!.id })
            : dayHref(date, query),
      };
    }),
  }));
}

export type TeamMonthDay = {
  date: string;
  isToday: boolean;
  /** Each session's colour and whether it was ridden, in the day's order; an unplanned ride is "none". */
  marks: Array<{ colour: ComplianceColour; done: boolean }>;
  /** The loudest of them, for the cell's tint; null for a day of rest. */
  colour: ComplianceColour | null;
  /** A race for this rider on the day — their own or the team's. */
  race: string | null;
  href: string | null;
};

/** A rider's row in the team's month: a mark per session and ride, and the race. */
export function teamMonthDays(
  riderId: string,
  days: readonly string[],
  input: {
    sessions: readonly CalendarCard[];
    activities: readonly CalendarActivityCard[];
    events: readonly CalendarEventCard[];
  },
  today: string,
): TeamMonthDay[] {
  const sessions = input.sessions.filter((s) => s.riderId === riderId);
  const rides = input.activities.filter((a) => a.riderId === riderId);
  const races = input.events.filter(
    (e) => e.kind === "race" && (e.riderId === null || e.riderId === riderId),
  );
  return days.map((date) => {
    const mine = sessionsOn(date, sessions, today);
    const marks = [
      ...mine.map((s) => ({ colour: s.colour, done: s.done })),
      ...rides
        .filter((a) => a.onDate === date)
        .map(() => ({ colour: "none" as const, done: true })),
    ];
    const race = races.find((e) => on(date, e));
    return {
      date,
      isToday: date === today,
      marks,
      colour: dayColour(marks.map((m) => m.colour)),
      race: race?.title ?? null,
      href:
        marks.length > 0 || race
          ? calendarHref({ rider: riderId, week: mondayOf(date) }) + `#day-${date}`
          : null,
    };
  });
}
